"use client"

import { Download, Send } from "lucide-react"
import { toPng } from "html-to-image"
import { useRef, useState } from "react"

import { CheckboxMark } from "@/components/game/checkbox-mark"
import { Gate, Notice } from "@/components/game/gate"
import { NftImage } from "@/components/game/nft-image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { errorMessage } from "@/lib/client"
import type { AppState } from "@/lib/state-types"
import { cn } from "@/lib/utils"

const cards = ["PARTY", "QUEST", "XP", "DIARY"] as const
type CardKind = (typeof cards)[number]

function initialCard(): CardKind {
  if (typeof window === "undefined") return "PARTY"
  const c = new URLSearchParams(window.location.search).get("card")
  return cards.includes(c as CardKind) ? (c as CardKind) : "PARTY"
}

export default function ShareStudio() {
  const [card, setCard] = useState<CardKind>(initialCard)
  // Goal names are hidden on share cards by default.
  const [hideNames, setHideNames] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  async function saveImage() {
    if (!cardRef.current) return
    setError(null)
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#DBEAFE" })
      const a = document.createElement("a")
      a.href = url
      a.download = `quest-chog-${card.toLowerCase()}.png`
      a.click()
    } catch (err) {
      // Usually an NFT image host without CORS headers.
      setError(`Could not save the image. ${errorMessage(err)}`)
    }
  }

  return (
    <Gate>
      {(state) => (
        <>
          <h1 className="font-pixel text-lg font-bold">SHARE STUDIO</h1>

          <Tabs value={card} onValueChange={(v) => setCard(v as CardKind)}>
            <TabsList className="h-auto w-full gap-0 overflow-hidden p-0 shadow-shadow">
              {cards.map((c, i) => (
                <TabsTrigger
                  key={c}
                  value={c}
                  className={cn(
                    "min-h-11 flex-1 rounded-none border-0 px-0.5 font-pixel text-[11px] font-bold data-[active]:bg-main",
                    i < cards.length - 1 && "border-r-2 border-border data-active:border-border",
                  )}
                >
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div ref={cardRef} className="p-1.5 pr-3 pb-3">
            <CardBody card={card} state={state} hideNames={hideNames} />
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={hideNames}
            onClick={() => setHideNames(!hideNames)}
            className="flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-base border-2 border-border bg-secondary-background px-3.5 text-left text-[15px] font-bold shadow-shadow"
          >
            <span>Hide goal names on the card</span>
            <CheckboxMark checked={hideNames} />
          </button>

          {error && <p role="alert" className="text-sm font-bold">{error}</p>}

          <div className="flex gap-3">
            <Button size="lg" className="min-h-13 flex-1 text-sm" onClick={saveImage}>
              <Download strokeWidth={3} /> SAVE IMAGE
            </Button>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(shareText(card, state, hideNames))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-base border-2 border-border bg-secondary-background font-pixel text-sm font-bold shadow-shadow [&_svg]:size-4"
            >
              <Send strokeWidth={3} /> POST TO X
            </a>
          </div>
        </>
      )}
    </Gate>
  )
}

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }

function shareText(card: CardKind, s: Ready, hide: boolean) {
  const c = s.chog
  switch (card) {
    case "QUEST":
      return s.lastCompleted
        ? `Quest complete: ${hide ? "a big goal" : s.lastCompleted.name}. +${s.lastCompleted.xpReward} XP with ${c.label}. #QuestChog`
        : `Questing with ${c.label}. #QuestChog`
    case "XP":
      return `${s.weeklyXp.reduce((a, d) => a + d.xp, 0)} XP this week with ${c.label}. #QuestChog`
    case "DIARY":
      return s.night ? `Night ${s.night.number}: ${s.night.title}. ${s.night.diary} #QuestChog` : `#QuestChog`
    default:
      return `Party LV ${c.level}. Streak ${c.streak}. ${c.items} items. You all win. #QuestChog`
  }
}

function CardBody({ card, state, hideNames }: { card: CardKind; state: Ready; hideNames: boolean }) {
  const { chog } = state

  if (card === "PARTY") {
    return (
      <ShareCard header={<><span>PARTY CARD</span><span>LV {chog.level}</span></>} headerFill="bg-main">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex gap-3">
            <NftImage alt="You" label="YOU" className="aspect-square flex-1 text-[13px]" />
            <NftImage src={chog.image} alt={chog.name} className="aspect-square flex-1 text-[11px]" />
          </div>
          <div className="text-center font-pixel text-[15px] font-bold">YOU ALL WIN</div>
          <div className="text-center text-[13px] font-bold">
            Streak {chog.streak}{" // "}{chog.items} items{" // "}Level {chog.level}
          </div>
        </div>
      </ShareCard>
    )
  }

  if (card === "QUEST") {
    if (!state.lastCompleted) {
      return <Notice title="NO QUEST COMPLETE YET" body="Finish a quest and its card shows up here." />
    }
    return (
      <ShareCard header="QUEST COMPLETE" headerFill="bg-green" bodyFill="bg-yellow">
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
          <div className="font-pixel text-[26px] leading-tight font-bold">
            {hideNames ? "A BIG GOAL" : state.lastCompleted.name.toUpperCase()}
          </div>
          {state.lastCompleted.chogQuest && (
            <div className="text-[15px] font-bold">
              {state.lastCompleted.chogQuest.done
                ? `Chog finished "${state.lastCompleted.chogQuest.name}" too.`
                : `Chog is still on "${state.lastCompleted.chogQuest.name}".`}
            </div>
          )}
          <div className="rounded-base border-2 border-border bg-secondary-background px-3.5 py-1 font-pixel text-base font-bold">
            +{state.lastCompleted.xpReward} XP
          </div>
        </div>
      </ShareCard>
    )
  }

  if (card === "XP") {
    const max = Math.max(...state.weeklyXp.map((d) => d.xp), 1)
    const total = state.weeklyXp.reduce((a, d) => a + d.xp, 0)
    return (
      <ShareCard header={<><span>XP THIS WEEK</span><span>{total} XP</span></>} headerFill="bg-violet">
        <div className="flex h-[150px] items-end gap-2 p-4" role="img" aria-label={`${total} XP earned this week`}>
          {state.weeklyXp.map((d, i) => (
            <div
              key={d.day}
              style={{ height: `${Math.max(4, Math.round((d.xp / max) * 100))}%` }}
              className={cn(
                "flex-1 rounded-t-[3px] border-2 border-border",
                d.xp === 0 ? "bg-secondary-background" : i === 6 ? "bg-yellow" : "bg-main",
              )}
            />
          ))}
        </div>
        <div className="flex justify-between px-4 pb-3 font-pixel text-[10px] font-bold">
          {state.weeklyXp.map((d) => (
            <span key={d.day}>{d.label}</span>
          ))}
        </div>
      </ShareCard>
    )
  }

  if (!state.night) return <Notice title="NO DIARY YET" body="Your Chog's first page arrives in the morning." />
  return (
    <ShareCard header={`NIGHT ${state.night.number} // DIARY PAGE`} headerFill="bg-violet">
      <div className="flex flex-col gap-2.5 p-4">
        <div className="font-pixel text-lg font-bold">{state.night.title}</div>
        <p className="text-[15px]">{state.night.diary}</p>
        <div className="font-pixel text-[11px] font-bold">
          {chog.label}{" // "}{state.night.items.length} ITEMS FOUND
        </div>
      </div>
    </ShareCard>
  )
}

function ShareCard({
  header,
  headerFill,
  bodyFill = "bg-secondary-background",
  children,
}: {
  header: React.ReactNode
  headerFill: string
  bodyFill?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("overflow-hidden rounded-base border-2 border-border shadow-shadow", bodyFill)}>
      <div
        className={cn(
          "flex justify-between border-b-2 border-border px-3.5 py-2.5 font-pixel text-[13px] font-bold",
          headerFill,
        )}
      >
        {header}
      </div>
      {children}
    </div>
  )
}
