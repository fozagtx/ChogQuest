import "server-only"

import { AI } from "@/lib/config"
import { env } from "@/lib/env"
import type { NightRoll } from "@/lib/night"

// The only place AI is used. It receives the deterministic roll and writes
// words. Numbers, items and rarity are never taken from its output.

export type Narration = { title: string; diary: string }

const TITLE_MAX = 48
const DIARY_MAX = 420

export async function narrateNight(tokenId: number, roll: NightRoll): Promise<Narration> {
  const key = env.nebiusApiKey()
  if (key) {
    try {
      return parseNarration(await viaNebius(key, buildPrompt(tokenId, roll)))
    } catch (err) {
      console.error("narration failed, using fallback", (err as Error).message)
    }
  }
  return fallbackNarration(roll)
}

function buildPrompt(tokenId: number, roll: NightRoll) {
  const itemList = roll.items.map((i) => `${i.name} (${i.rarity})`).join(", ")
  return [
    `Write tonight's diary page for Chog #${tokenId}, a small mischievous creature that sneaks out at night.`,
    `It came home with: ${itemList}.`,
    roll.isRareNight ? "This was a rare night: make the title feel special." : "",
    "Tone: plain, kind, funny, no guilt. No emoji. Do not mention money, tokens or prices.",
    `Reply with JSON only: {"title": "<max 5 words, uppercase>", "diary": "<2 or 3 short sentences, third person, mention every item>"}`,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Nebius Token Factory, OpenAI-compatible chat completions. */
async function viaNebius(key: string, prompt: string) {
  const res = await fetch(`${AI.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI.model,
      max_tokens: 400,
      temperature: 0.9,
      messages: [
        { role: "system", content: "You write short, warm diary pages for a game. Reply with JSON only." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Nebius ${res.status}`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return body.choices?.[0]?.message?.content ?? ""
}

function parseNarration(text: string): Narration {
  // Reasoning models may think out loud first; keep only the final answer.
  const answer = text.replace(/<think>[\s\S]*?<\/think>/g, "")
  const json = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1)) as Partial<Narration>
  if (typeof json.title !== "string" || typeof json.diary !== "string") throw new Error("bad AI shape")
  return {
    title: json.title.toUpperCase().slice(0, TITLE_MAX),
    diary: json.diary.slice(0, DIARY_MAX),
  }
}

// Used when no AI key is configured or the call fails. Deterministic per roll.
const OPENERS = [
  "Chog slipped out after midnight",
  "Chog tiptoed past the sleeping cat",
  "Chog climbed out the window at 2:14",
  "Chog followed a moth down the hallway",
]
const TITLES = ["THE QUIET HEIST", "A SMALL ADVENTURE", "MIDNIGHT ERRANDS", "THE LONG WAY HOME"]
const RARE_TITLES = ["THE GREAT CUPBOARD CAPER", "A NIGHT TO REMEMBER", "THE MOONLIT DISCOVERY"]

export function fallbackNarration(roll: NightRoll): Narration {
  const n = parseInt(roll.seedHash.slice(0, 8), 16)
  const names = roll.items.map((i) => i.name.toLowerCase())
  const found =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  return {
    title: (roll.isRareNight ? RARE_TITLES : TITLES)[n % (roll.isRareNight ? RARE_TITLES : TITLES).length],
    diary: `${OPENERS[n % OPENERS.length]} and came home with ${found}. It looks very pleased with itself.`,
  }
}
