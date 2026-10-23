"use client"

import { motion } from "motion/react"
import { BookOpen, Flame, PackageOpen, Plus, Star, Trophy, User } from "lucide-react"

import { ChogLetter, Wordmark } from "@/components/brand/chog-letter"
import { NftImage } from "@/components/game/nft-image"
import { EmptyCard } from "@/components/screens/empty"
import { bouncy } from "@/components/screens/kit"
import type { Rarity } from "@/lib/items"
import type { AppState } from "@/lib/state-types"
import { cn } from "@/lib/utils"

export const cards = ["PARTY", "QUEST", "XP", "DIARY"] as const
export type CardKind = (typeof cards)[number]

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }

/** Whether this card has real content to show (and therefore to save). */
export function cardReady(card: CardKind, s: Ready) {
  if (card === "QUEST") return !!s.lastCompleted
  if (card === "DIARY") return !!s.night
  return true
}

export function shareText(card: CardKind, s: Ready, hide: boolean) {
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

const frame = "relative flex w-full flex-col overflow-hidden rounded-[36px] p-6 shadow-[0_24px_50px_-24px_rgb(26_18_0/0.45)]"

function Footer({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div className={cn("relative mt-auto flex items-center justify-between pt-5 text-[13px] font-black", dark ? "text-white/80" : "text-ink/70")}>
      <Wordmark className={cn("font-pixel text-[20px] font-black tracking-tight", dark ? "text-white" : "text-ink")} />
      <span>{label}</span>
    </div>
  )
}

function ChogSticker({ s, className }: { s: Ready; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.4, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...bouncy, delay: 0.15 }}
      className={cn("sticker rounded-[24px] border-[5px] border-white", className)}
    >
      <NftImage src={s.chog.image} alt={s.chog.name} className="size-full rounded-[19px] border-0 text-[9px]" />
    </motion.div>
  )
}

export function CardBody({ card, state, hideNames }: { card: CardKind; state: Ready; hideNames: boolean }) {
  const { chog } = state

  if (card === "PARTY") {
    const stats = [
      { icon: Flame, value: chog.streak, label: "streak" },
      { icon: PackageOpen, value: chog.items, label: "items" },
      { icon: Star, value: chog.level, label: "level" },
    ]
    return (
      <div className={cn(frame, "bg-cream")}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-14 size-44 rotate-[-18deg] opacity-15">
          <ChogLetter letter="O" color="#FFB800" className="size-full" />
        </div>
        <div className="relative flex items-center justify-between">
          <span className="rounded-full bg-ink px-3 py-1 text-[13px] font-black text-main">Party card</span>
          <span className="rounded-full bg-main px-3 py-1 text-[13px] font-black text-ink">LV {chog.level}</span>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.4, rotate: 20 }}
            animate={{ scale: 1, rotate: -7 }}
            transition={{ ...bouncy, delay: 0.1 }}
            className="sticker flex size-32 flex-col items-center justify-center gap-1 rounded-[28px] border-[5px] border-white bg-main"
          >
            <User className="size-12 text-ink" strokeWidth={2.5} aria-hidden="true" />
            <span className="text-[15px] font-black">YOU</span>
          </motion.div>
          <div
            aria-hidden="true"
            className="z-10 -mx-3 flex size-11 items-center justify-center rounded-full bg-ink text-main shadow-shadow"
          >
            <Plus className="size-5" strokeWidth={3.5} />
          </div>
          <ChogSticker s={state} className="size-32 rotate-6" />
        </div>

        <p className="relative text-center font-pixel text-[34px] leading-none font-black tracking-tight">You all win.</p>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {stats.map((st) => (
            <div key={st.label} className="flex flex-col items-center gap-0.5 rounded-[20px] bg-white py-2.5">
              <st.icon className="size-4 text-ink/70" strokeWidth={3} aria-hidden="true" />
              <span className="text-[22px] leading-none font-black tabular-nums">{st.value}</span>
              <span className="text-[12px] font-extrabold text-ink/70">{st.label}</span>
            </div>
          ))}
        </div>
        <Footer label={chog.label} />
      </div>
    )
  }

  if (card === "QUEST") {
    const done = state.lastCompleted
    if (!done) {
      return (
        <EmptyCard
          icon={<Trophy strokeWidth={2.5} />}
          title="No quest complete yet"
          body="Finish a quest and its card shows up here, ready to post."
          className="w-full"
        />
      )
    }
    return (
      <div className={cn(frame, "bg-main")}>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-12 size-48 rotate-12 opacity-15">
          <ChogLetter letter="O" tone="ink" className="size-full" />
        </div>
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[13px] font-black text-main">
            <Trophy className="size-3.5" strokeWidth={3} aria-hidden="true" /> Quest complete
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-[13px] font-black">LV {chog.level}</span>
        </div>
        <div className="relative mt-6 flex flex-col gap-3 pr-24">
          <p className="font-pixel text-[30px] leading-[1.05] font-black tracking-tight break-words">
            {hideNames ? "A big goal." : done.name}
          </p>
          {done.chogQuest && (
            <p className="text-[15px] font-extrabold text-ink/80">
              {done.chogQuest.done
                ? `Chog finished "${done.chogQuest.name}" too.`
                : `Chog is still on "${done.chogQuest.name}".`}
            </p>
          )}
        </div>
        <ChogSticker s={state} className="absolute top-20 right-5 size-24 rotate-6" />
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ ...bouncy, delay: 0.25 }}
          className="relative mt-5 self-start rounded-full bg-white px-5 py-2 text-[24px] font-black tabular-nums"
        >
          +{done.xpReward} XP
        </motion.span>
        <Footer label={chog.label} />
      </div>
    )
  }

  if (card === "XP") {
    const max = Math.max(...state.weeklyXp.map((d) => d.xp), 1)
    const total = state.weeklyXp.reduce((a, d) => a + d.xp, 0)
    return (
      <div className={cn(frame, "bg-[#1E1638] text-white")}>
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-black text-main">XP this week</p>
            <p className="mt-1 font-pixel text-[44px] leading-none font-black tabular-nums">{total}</p>
            <p className="mt-1 text-[14px] font-bold text-white/75">
              {total > 0 ? `with ${chog.label}` : "Check in to fill this week."}
            </p>
          </div>
          <ChogSticker s={state} className="size-20 rotate-6" />
        </div>
        <div className="relative mt-6 flex h-[150px] items-end gap-2" role="img" aria-label={`${total} XP earned this week`}>
          {state.weeklyXp.map((d, i) => (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.1 + i * 0.05 }}
                style={{ height: `${Math.max(6, Math.round((d.xp / max) * 100))}%`, originY: 1 }}
                className={cn(
                  "w-full rounded-[10px]",
                  d.xp === 0 ? "bg-white/12" : i === state.weeklyXp.length - 1 ? "bg-white" : "bg-main",
                )}
              />
            </div>
          ))}
        </div>
        <div className="relative mt-2 flex gap-2 text-center text-[12px] font-black text-white/75" aria-hidden="true">
          {state.weeklyXp.map((d) => (
            <span key={d.day} className="flex-1">
              {d.label}
            </span>
          ))}
        </div>
        <Footer label={chog.label} dark />
      </div>
    )
  }

  const night = state.night
  if (!night) {
    return (
      <EmptyCard
        icon={<BookOpen strokeWidth={2.5} />}
        title="No diary yet"
        body="Your Chog's first page arrives in the morning."
        className="w-full"
      />
    )
  }
  const chip: Record<Rarity, string> = {
    COMMON: "bg-white text-ink",
    RARE: "bg-[#6A4BE8] text-white",
    EPIC: "bg-main text-ink",
  }
  return (
    <div className={cn(frame, "bg-[#F1ECFF]")}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-12 size-44 rotate-[-16deg] opacity-20">
        <ChogLetter letter="O" color="#8B6CFF" className="size-full" />
      </div>
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4B2A9E] px-3 py-1 text-[13px] font-black text-white">
          <BookOpen className="size-3.5" strokeWidth={3} aria-hidden="true" /> Night {night.number}
        </span>
        <span className="text-[13px] font-black text-ink/70">Diary page</span>
      </div>
      <div className="relative mt-5 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[26px] leading-[1.1] font-black tracking-tight break-words">{night.title}</p>
        </div>
        <ChogSticker s={state} className="size-20 flex-none rotate-6" />
      </div>
      <p className="relative mt-3 rounded-[22px] bg-white/80 p-4 text-[15px] leading-relaxed font-bold text-ink/85">
        {night.diary}
      </p>
      {night.items.length > 0 && (
        <ul className="relative mt-3 flex flex-wrap gap-1.5">
          {night.items.map((it) => (
            <li key={it.id} className={cn("rounded-full px-3 py-1 text-[13px] font-black", chip[it.rarity])}>
              {it.name}
            </li>
          ))}
        </ul>
      )}
      <Footer label={`${chog.label} // ${night.items.length} ${night.items.length === 1 ? "item" : "items"}`} />
    </div>
  )
}
