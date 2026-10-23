import "server-only"

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm"

import { safeEqual } from "@/lib/crypto"
import { today } from "@/lib/days"
import { getDb, schema } from "@/lib/db"
import { env } from "@/lib/env"
import { getOrCreateNight } from "@/lib/game"
import { sendMessage } from "@/lib/telegram"

const { users, notifications, nights, xpEvents } = schema

export function cronAuthorized(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? ""
  return given.length > 0 && safeEqual(given, env.cronSecret)
}

function inQuietHours(u: { quietStart: number | null; quietEnd: number | null }, hour: number) {
  if (u.quietStart === null || u.quietEnd === null) return false
  return u.quietStart <= u.quietEnd
    ? hour >= u.quietStart && hour < u.quietEnd
    : hour >= u.quietStart || hour < u.quietEnd
}

/** One message per user per kind per day, respecting mute and quiet hours. */
async function notifyOnce(
  user: typeof users.$inferSelect,
  kind: string,
  text: string,
  buttons?: Parameters<typeof sendMessage>[2],
) {
  if (!user.telegramId || user.telegramMuted) return false
  if (inQuietHours(user, new Date().getUTCHours())) return false
  const claimed = await getDb()
    .insert(notifications)
    .values({ userId: user.id, kind, day: today() })
    .onConflictDoNothing()
    .returning({ id: notifications.id })
  if (claimed.length === 0) return false
  try {
    await sendMessage(user.telegramId, text, buttons)
    return true
  } catch (err) {
    console.error(`notify ${kind} failed for user ${user.id}`, (err as Error).message)
    return false
  }
}

async function activeUsers() {
  return getDb().select().from(users).where(isNotNull(users.activeChogTokenId))
}

/** Generates last night's diary for every active Chog and sends the morning message. */
export async function runMorning() {
  const day = today()
  const list = await activeUsers()
  const tokenIds = [...new Set(list.map((u) => u.activeChogTokenId!))]
  let generated = 0
  for (const tokenId of tokenIds) {
    await getOrCreateNight(tokenId, day)
    generated++
  }

  let sent = 0
  const rows = tokenIds.length
    ? await getDb()
        .select()
        .from(nights)
        .where(and(eq(nights.day, day), inArray(nights.chogTokenId, tokenIds)))
    : []
  const byToken = new Map(rows.map((n) => [n.chogTokenId, n]))
  for (const user of list) {
    const night = byToken.get(user.activeChogTokenId!)
    if (!night) continue
    const rare = night.rarityMax === "EPIC" ? " A rare night." : ""
    const ok = await notifyOnce(
      user,
      "morning",
      `Your Chog is home. ${night.title}.${rare} It brought back ${night.items.length} item${night.items.length > 1 ? "s" : ""}.`,
      [[{ text: "Read the diary", url: `${env.appUrl()}/app` }, { text: `Claim ${night.items.length}`, callback_data: `claim:${day}` }]],
    )
    if (ok) sent++
  }
  return { day, generated, sent }
}

/** Evening nudges: an unclaimed night, or a streak at risk. Never more than one a day. */
export async function runEvening() {
  const day = today()
  const list = await activeUsers()
  let sent = 0
  for (const user of list) {
    const tokenId = user.activeChogTokenId!
    const [unclaimed] = await getDb()
      .select({ day: nights.day, items: nights.items })
      .from(nights)
      .where(and(eq(nights.chogTokenId, tokenId), eq(nights.day, day), isNull(nights.claimedAt)))
    const [activity] = await getDb()
      .select({ id: xpEvents.id })
      .from(xpEvents)
      .where(and(eq(xpEvents.chogTokenId, tokenId), eq(xpEvents.day, day)))
      .limit(1)

    let ok = false
    if (unclaimed) {
      ok = await notifyOnce(
        user,
        "evening",
        `Your Chog is still holding ${unclaimed.items.length} item${unclaimed.items.length > 1 ? "s" : ""} from last night. Claim whenever you are ready.`,
        [
          [{ text: "Claim now", callback_data: `claim:${unclaimed.day}` }],
          [{ text: "Remind me later", callback_data: "later" }, { text: "Mute", callback_data: "mute" }],
        ],
      )
    } else if (!activity) {
      ok = await notifyOnce(
        user,
        "evening",
        "Quiet day? A quick check-in keeps your streak going. Just send me what you did.",
        [[{ text: "Mute", callback_data: "mute" }]],
      )
    }
    if (ok) sent++
  }
  return { day, sent }
}
