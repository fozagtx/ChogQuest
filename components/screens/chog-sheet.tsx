"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowRight,
  BedDouble,
  Circle,
  ExternalLink,
  Flame,
  Gem,
  Moon,
  PackageOpen,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { useAppState } from "@/components/game/app-state"
import { NftImage } from "@/components/game/nft-image"
import { EmptyCard } from "@/components/screens/empty"
import { CountUp, Ring, Rise, Screen, ScreenHeader, Shimmer, Stagger, Tilt, bouncy, spring } from "@/components/screens/kit"
import { buttonVariants } from "@/components/ui/button"
import { api, errorMessage } from "@/lib/client"
import { explorerAddress } from "@/lib/config"
import type { Rarity } from "@/lib/items"
import type { AppState } from "@/lib/state-types"
import { LEVEL_XP } from "@/lib/xp"
import { cn } from "@/lib/utils"

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }

/** Sticker colours by rarity. RARE uses a deeper violet so white text keeps AA contrast. */
const rarityStyle: Record<Rarity, { card: string; chip: string; icon: typeof Gem; label: string }> = {
  COMMON: { card: "bg-white text-ink", chip: "bg-ink/8 text-ink", icon: Circle, label: "Common" },
  RARE: { card: "bg-[#6A4BE8] text-white", chip: "bg-white/20 text-white", icon: Gem, label: "Rare" },
  EPIC: { card: "bg-main text-ink", chip: "bg-ink text-main", icon: Sparkles, label: "Epic" },
}

export function ChogSheetScreen({ state }: { state: Ready }) {
  const { chog } = state
  const stats = [
    { value: chog.nights, label: "Nights", icon: Moon, fill: "bg-[#1E1638] text-white", iconFill: "bg-white/12 text-main" },
    { value: chog.items, label: "Items", icon: PackageOpen, fill: "bg-white", iconFill: "bg-main text-ink" },
    { value: chog.rare, label: "Rare finds", icon: Gem, fill: "bg-white", iconFill: "bg-[#6A4BE8] text-white" },
  ]
  const lost = state.lostAndFound.items

  return (
    <Screen>
      <ScreenHeader title="Chog sheet" kicker="Everything follows the Chog." headColor="#8B6CFF" />

      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @2xl:items-start">
        <Rise>
          <CollectibleCard state={state} />
        </Rise>

        <div className="flex flex-col gap-5">
          <Rise>
            <LevelPanel chog={chog} />
          </Rise>

          <Stagger className="grid grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <Rise key={s.label} className={cn("flex flex-col gap-2 rounded-[26px] p-3.5 shadow-shadow", s.fill)}>
                <span
                  aria-hidden="true"
                  className={cn("flex size-9 items-center justify-center rounded-[12px]", s.iconFill)}
                >
                  <s.icon className="size-[18px]" strokeWidth={2.5} />
                </span>
                <CountUp value={s.value} className="text-[28px] leading-none font-black" />
                <span className={cn("text-[12px] font-extrabold", s.fill.includes("text-white") ? "text-white/80" : "text-ink/70")}>
                  {s.label}
                </span>
              </Rise>
            ))}
          </Stagger>
        </div>
      </div>

      <Rise as="section" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black">Inventory</h2>
          {state.inventory.length > 0 && (
            <span className="text-[13px] font-bold text-ink/70">
              {state.inventory.reduce((a, i) => a + i.count, 0)} collected
            </span>
          )}
        </div>
        {state.inventory.length === 0 ? (
          <EmptyCard
            icon={<PackageOpen strokeWidth={2.5} />}
            title="Empty for now"
            body="Every night your Chog brings back souvenirs. Claim a night to fill this up."
          >
            <Link href="/app" className={cn(buttonVariants({ variant: "neutral" }), "min-h-11 px-5")}>
              Go to Today <ArrowRight strokeWidth={3} />
            </Link>
          </EmptyCard>
        ) : (
          <Stagger as="ul" className="grid grid-cols-3 gap-3 @lg:grid-cols-4 @3xl:grid-cols-6" gap={0.04}>
            {state.inventory.map((item, i) => (
              <ItemSticker key={item.id} name={item.name} rarity={item.rarity} count={item.count} index={i} />
            ))}
          </Stagger>
        )}
      </Rise>

      {lost.length > 0 && (
        <Rise as="section" className="relative overflow-hidden rounded-[32px] bg-accent-soft p-5">
          <div aria-hidden="true" className="pointer-events-none absolute -top-6 -right-12 size-36 rotate-[-18deg] opacity-30">
            <ChogLetter letter="O" color="#FFB800" className="size-full" />
          </div>
          <h2 className="relative text-lg font-black">Lost and found</h2>
          <p className="relative mt-1 text-[15px] font-bold text-ink/75">
            {lost.length} {lost.length === 1 ? "item" : "items"} from last week slipped away. See what your Chog was up to.
          </p>
          <ul className="relative mt-3 flex flex-wrap gap-2">
            {lost.map((it, i) => (
              <li
                key={`${it.name}-${i}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-extrabold opacity-90 shadow-shadow",
                  rarityStyle[it.rarity].card,
                )}
              >
                {it.name}
              </li>
            ))}
          </ul>
        </Rise>
      )}

      <Rise>
        <a
          href={explorerAddress(state.chronicle.address)}
          target="_blank"
          rel="noreferrer"
          className="group relative flex min-h-16 items-center gap-3.5 overflow-hidden rounded-[28px] bg-[#1E1638] p-4 pr-5 text-white transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-main text-ink">
            <ShieldCheck className="size-5" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-black">Chronicle on Monad</span>
            <span className="block text-[13px] font-bold text-white/75">
              Recorded against {chog.label}. If it moves wallets, its inventory goes with it.
            </span>
            <span className="mt-0.5 block truncate font-mono text-[12px] text-white/70" title={state.chronicle.address}>
              {state.chronicle.address}
            </span>
          </span>
          <ExternalLink className="size-5 flex-none text-main transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Rise>

      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <Rise>
          <TelegramLink linked={state.user.telegramLinked} muted={state.user.telegramMuted} />
        </Rise>
        <Rise>
          <DeleteData />
        </Rise>
      </div>
    </Screen>
  )
}

/** The Chog's real NFT image, held like a collectible card. */
function CollectibleCard({ state }: { state: Ready }) {
  const { chog } = state
  return (
    <Tilt className="mx-auto w-full max-w-[360px] rounded-[36px]">
      <div className="relative overflow-hidden rounded-[36px] bg-white p-3 shadow-[0_30px_60px_-28px_rgb(26_18_0/0.45)]">
        <div className="relative overflow-hidden rounded-[26px]">
          <NftImage src={chog.image} alt={chog.name} className="aspect-square w-full rounded-[26px] border-0 text-sm" />
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ ...bouncy, delay: 0.45 }}
            className="sticker absolute top-3 left-3 rounded-full border-[3px] border-white bg-main px-3 py-1 text-[14px] font-black text-ink"
          >
            LV {chog.level}
          </motion.span>
          {chog.isTest && (
            <span className="absolute top-3 right-3 rounded-full bg-[#6A4BE8] px-2.5 py-1 text-[12px] font-black text-white">
              TEST
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-2 pt-3 pb-1">
          <div className="min-w-0">
            <p className="truncate text-xl font-black">{chog.label}</p>
            {chog.name !== chog.label && <p className="truncate text-[13px] font-bold text-ink/70">{chog.name}</p>}
          </div>
          <ChogLetter letter="Q" className="size-9 flex-none" />
        </div>
      </div>
    </Tilt>
  )
}

function LevelPanel({ chog }: { chog: Ready["chog"] }) {
  return (
    <div className="flex items-center gap-4 rounded-[32px] bg-white p-4 shadow-shadow">
      <Ring value={chog.levelPct} label={`Level ${chog.level} progress`} size={104} stroke={11}>
        <span className="text-[11px] font-black text-ink/70">LEVEL</span>
        <CountUp value={chog.level} className="text-[34px] leading-none font-black" />
      </Ring>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[15px] font-black">
          <CountUp value={chog.levelXp} /> <span className="text-ink/70">/ {LEVEL_XP} XP</span>
        </p>
        <p className="text-[13px] font-bold text-ink/70">
          {Math.max(0, LEVEL_XP - chog.levelXp)} XP to level {chog.level + 1}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-red/15 px-2.5 py-1 text-[13px] font-black text-[#9A2416]">
            <Flame className="size-3.5" strokeWidth={3} aria-hidden="true" />
            {chog.streak} {chog.streak === 1 ? "day" : "days"}
          </span>
          {chog.sleepInAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[13px] font-black text-[#4B2A9E]">
              <BedDouble className="size-3.5" strokeWidth={3} aria-hidden="true" />
              Sleep-in ready
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemSticker({ name, rarity, count, index }: { name: string; rarity: Rarity; count: number; index: number }) {
  const s = rarityStyle[rarity]
  const tilt = [-4, 3, -2, 5, -5, 2][index % 6]
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, scale: 0.6, rotate: tilt * 3 },
        show: { opacity: 1, scale: 1, rotate: tilt, transition: bouncy },
      }}
      whileHover={{ scale: 1.06, rotate: 0, y: -4 }}
      transition={spring}
      className={cn(
        "sticker relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[22px] border-[4px] border-white p-2.5",
        s.card,
      )}
    >
      {rarity === "EPIC" && <Shimmer />}
      <div className="relative flex items-start justify-between">
        <s.icon className="size-5" strokeWidth={2.5} aria-hidden="true" />
        {count > 1 && <span className={cn("rounded-full px-1.5 text-[12px] leading-5 font-black", s.chip)}>x{count}</span>}
      </div>
      <div className="relative">
        <p className="text-[13px] leading-tight font-black break-words">{name}</p>
        <p className={cn("mt-1 text-[11px] font-extrabold", rarity === "RARE" ? "text-white/85" : "text-ink/70")}>
          {s.label}
        </p>
      </div>
    </motion.li>
  )
}

function TelegramLink({ linked, muted }: { linked: boolean; muted: boolean }) {
  const [code, setCode] = useState<{ code: string; url: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function makeCode() {
    try {
      setCode(await api("/api/telegram/link-code", { method: "POST" }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const on = linked && !muted

  return (
    <section className="flex h-full flex-col gap-3 rounded-[32px] bg-white p-5 shadow-shadow">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-[#E6F3FF] text-[#1A6FB5]">
          <Send className="size-5" strokeWidth={2.5} />
        </span>
        <h2 className="flex-1 text-lg font-black">Telegram</h2>
        {on && (
          <span className="rounded-full bg-green/20 px-2.5 py-1 text-[12px] font-black text-[#17633C]">Linked</span>
        )}
      </div>
      {on ? (
        <p className="text-[15px] font-bold text-ink/75">
          Each evening the bot lets you know when your Chog&apos;s items are waiting, with a Claim button.
        </p>
      ) : code ? (
        code.url ? (
          <>
            <p className="text-[15px] font-bold text-ink/75">
              Open the bot and press Start. That links it. The link works for 15 minutes.
            </p>
            <a
              href={code.url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants(), "mt-auto min-h-12 w-full")}
            >
              Open Telegram <ExternalLink strokeWidth={3} />
            </a>
          </>
        ) : (
          <p className="text-[15px] font-bold text-ink/75">
            Send <span className="rounded-md bg-ink/8 px-1.5 py-0.5 font-mono font-bold text-ink">/start {code.code}</span> to
            the Quest Chog bot within 15 minutes.
          </p>
        )
      ) : (
        <>
          <p className="text-[15px] font-bold text-ink/75">
            {muted
              ? "Nudges are muted. Link again to turn them back on."
              : "Get one evening message when your Chog's items are waiting, with a Claim button."}
          </p>
          <button type="button" onClick={makeCode} className={cn(buttonVariants(), "mt-auto min-h-12 w-full")}>
            Link Telegram
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-[14px] bg-red/15 px-3 py-2 text-sm font-bold text-[#9A2416]">
          {error}
        </p>
      )}
    </section>
  )
}

function DeleteData() {
  const { refresh } = useAppState()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <section className="flex h-full flex-col gap-3 rounded-[32px] bg-white p-5 shadow-shadow">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-red/15 text-[#9A2416]">
          <Trash2 className="size-5" strokeWidth={2.5} />
        </span>
        <h2 className="text-lg font-black">Your data</h2>
      </div>
      <p className="text-[15px] font-bold text-ink/75">
        Goals and check-in notes are encrypted. Delete removes them for good. XP and items stay with the Chog.
      </p>
      {done ? (
        <p className="mt-auto font-black" role="status">
          Deleted.
        </p>
      ) : (
        <motion.button
          type="button"
          animate={confirm ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            buttonVariants({ variant: "neutral" }),
            "mt-auto min-h-12 w-full",
            confirm && "bg-[#C8321F] text-white hover:bg-[#B02A19]",
          )}
          onClick={async () => {
            if (!confirm) return setConfirm(true)
            await api("/api/me/data", { method: "DELETE" })
            setDone(true)
            await refresh()
          }}
        >
          {confirm ? "Tap again to delete" : "Delete my data"}
        </motion.button>
      )}
    </section>
  )
}
