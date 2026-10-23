"use client"

import Link from "next/link"
import { Check, Clock, Flame, Gem, Moon, Sparkles, Star } from "lucide-react"
import { AnimatePresence, motion, type Variants } from "motion/react"
import { useEffect, useState } from "react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { useAppState } from "@/components/game/app-state"
import { useBurst } from "@/components/fx/burst"
import { floatText } from "@/components/fx/float-number"
import { Magnetic } from "@/components/fx/magnetic"
import { CheckboxMark } from "@/components/game/checkbox-mark"
import { Gate, Notice } from "@/components/game/gate"
import { NftImage } from "@/components/game/nft-image"
import { ChogHair } from "@/components/landing/chog-hair"
import { Button, buttonVariants } from "@/components/ui/button"
import { api, claimOnChain, errorMessage } from "@/lib/client"
import { explorerTx } from "@/lib/config"
import { dayNumber, formatTimeLeft } from "@/lib/days"
import type { Rarity } from "@/lib/items"
import type { NightView } from "@/lib/state-types"
import { CHECKIN_XP, LEVEL_XP } from "@/lib/xp"
import { cn } from "@/lib/utils"

const rise: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 24 } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function Today() {
  const { refresh } = useAppState()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const burst = useBurst()

  /** `after` runs only on success, after the refreshed state has been fetched. */
  async function run(key: string, fn: () => Promise<string>, after?: () => void) {
    setBusy(key)
    setMessage(null)
    try {
      setMessage(await fn())
      await refresh()
      after?.()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Gate>
      {(state) => {
        const { chog, night } = state
        const yours = state.quests.filter((q) => q.owner === "you" && q.status === "active")
        const chogQuest = state.quests.find((q) => q.owner === "chog" && q.status === "active")

        return (
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
            <motion.div variants={rise} className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-[34px] leading-none font-black tracking-tight">Today</h1>
                <p className="mt-1.5 text-[15px] font-bold text-ink/60">Level {chog.level} with {chog.label}</p>
              </div>
              <StreakChip streak={chog.streak} />
            </motion.div>

            <motion.div variants={rise}>
              {night ? (
                <NightCard
                  night={night}
                  image={chog.image}
                  chogLabel={chog.label}
                  busy={busy === "claim"}
                  onClaim={(button) =>
                    run("claim", async () => {
                      // The player's own wallet claims on Chronicle; the app then records it.
                      const txHash = await claimOnChain(
                        state.chronicle.address as `0x${string}`,
                        chog.tokenId,
                        dayNumber(night.day),
                      )
                      const res = await api<{ xpGain: number; txHash: string }>("/api/claim", { body: { txHash } })
                      burst(button, night.rarityMax === "EPIC" ? "epic" : "celebrate")
                      if (res.xpGain > 0) floatText(button, `+${res.xpGain} XP`)
                      return `Claimed. +${res.xpGain} XP, recorded on Monad.`
                    })
                  }
                />
              ) : (
                <TonightCard image={chog.image} chogLabel={chog.label} />
              )}
            </motion.div>

            <AnimatePresence initial={false}>
              {message && (
                <motion.p
                  key={message}
                  role="status"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="rounded-[20px] bg-ink px-4 py-3 text-[15px] font-bold text-cream shadow-shadow"
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.section variants={rise} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-[22px] font-black tracking-tight">Check in</h2>
                <span className="text-[13px] font-bold text-ink/60">+{CHECKIN_XP} XP each</span>
              </div>
              {yours.length === 0 && (
                <Notice title="No goals yet" body="Set a goal to start checking in." icon={Sparkles}>
                  <Link href="/app/quests" className={cn(buttonVariants(), "w-full rounded-full")}>
                    Set a goal
                  </Link>
                </Notice>
              )}
              {yours.map((q) => (
                <motion.button
                  key={q.id}
                  type="button"
                  role="checkbox"
                  aria-checked={q.checkedInToday}
                  disabled={q.checkedInToday || busy !== null}
                  whileHover={q.checkedInToday ? undefined : { y: -2 }}
                  whileTap={q.checkedInToday ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  onClick={(e) => {
                    const mark = e.currentTarget.querySelector("[data-checkmark]")
                    run(
                      `checkin:${q.id}`,
                      async () => {
                        const res = await api<{ xp: number; questCompleted: boolean }>("/api/checkins", {
                          body: { goalId: q.id },
                        })
                        return res.questCompleted
                          ? `Quest complete. +${res.xp} XP. Make a card for it.`
                          : `Checked in. +${res.xp} XP.`
                      },
                      // Fires after refresh, in sync with the mark's pop.
                      () => burst(mark?.isConnected ? mark : null, "check"),
                    )
                  }}
                  className={cn(
                    "flex min-h-[68px] cursor-pointer items-center gap-3.5 rounded-[24px] px-4 py-3 text-left shadow-shadow ring-1 transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default",
                    q.checkedInToday ? "bg-[#EAF8F0] ring-[#1F9D5C]/20" : "bg-white/90 ring-ink/5",
                  )}
                >
                  <CheckboxMark checked={q.checkedInToday} pop />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[12px] font-extrabold tracking-wide text-ink/55 uppercase">You</span>
                    <span className="text-[16px] leading-snug font-extrabold">{q.name}</span>
                  </span>
                  <span
                    className={cn(
                      "flex-none rounded-full px-2.5 py-1 text-[12px] font-black",
                      q.checkedInToday ? "bg-[#1F9D5C] text-white" : "bg-accent-softer text-ink",
                    )}
                  >
                    {q.checkedInToday ? "Done" : `+${CHECKIN_XP} XP`}
                  </span>
                  {busy === `checkin:${q.id}` && <span className="sr-only">Checking in</span>}
                </motion.button>
              ))}
              {chogQuest && (
                <div className="relative flex min-h-[68px] items-center gap-3.5 overflow-hidden rounded-[24px] bg-white/90 px-4 py-3 shadow-shadow ring-1 ring-ink/5">
                  <ChogLetter
                    letter="O"
                    color="#8B6CFF"
                    className="pointer-events-none absolute -right-6 -bottom-8 size-24 -rotate-[20deg] opacity-[0.1]"
                  />
                  <CheckboxMark checked={chogQuest.checkedInToday} />
                  <span className="relative flex min-w-0 flex-1 flex-col">
                    <span className="text-[12px] font-extrabold tracking-wide text-[#5B3FD0] uppercase">Your Chog</span>
                    <span className="text-[16px] leading-snug font-extrabold">{chogQuest.name}</span>
                    <span className="text-[13px] font-semibold text-ink/60">Moves when you check in</span>
                  </span>
                  <StepDots done={chogQuest.stepsDone} total={chogQuest.stepsTotal} />
                </div>
              )}
            </motion.section>

            <motion.div variants={rise}>
              <LevelCard level={chog.level} levelXp={chog.levelXp} levelPct={chog.levelPct} />
            </motion.div>
          </motion.div>
        )
      }}
    </Gate>
  )
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ scale: 0.4, rotate: -12 }}
      animate={{ scale: 1, rotate: -3 }}
      whileHover={{ rotate: 3, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 360, damping: 13, delay: 0.25 }}
      className="sticker flex flex-none items-center gap-1.5 rounded-full border-[3px] border-white bg-red py-1.5 pr-3.5 pl-2.5 text-[15px] font-black text-ink"
      aria-label={`${streak} day streak`}
    >
      <motion.span
        animate={streak > 0 ? { scale: [1, 1.18, 1], rotate: [0, -8, 0] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex"
      >
        <Flame className="size-[18px]" strokeWidth={2.75} aria-hidden="true" />
      </motion.span>
      <span aria-hidden="true">
        {streak} day{streak === 1 ? "" : "s"}
      </span>
    </motion.div>
  )
}

function StepDots({ done, total }: { done: number; total: number }) {
  const shown = Math.min(total, 7)
  const filled = total > 7 ? Math.round((done / total) * shown) : done
  return (
    <span className="relative flex flex-none flex-col items-end gap-1.5">
      <span className="text-[13px] font-black tabular-nums">
        {done}/{total}
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.4 + i * 0.04 }}
            className={cn("size-2 rounded-full", i < filled ? "bg-violet" : "bg-ink/15")}
          />
        ))}
      </span>
    </span>
  )
}

function LevelCard({ level, levelXp, levelPct }: { level: number; levelXp: number; levelPct: number }) {
  const pct = Math.max(0, Math.min(100, levelPct))
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-white/90 p-5 shadow-shadow ring-1 ring-ink/5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-12 flex-none -rotate-6 flex-col items-center justify-center rounded-[16px] bg-main leading-none shadow-[0_8px_18px_-8px_rgb(255_184_0/0.9)]">
          <span className="text-[10px] font-black">LV</span>
          <span className="text-[20px] font-black tabular-nums">{level}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-[18px] font-black tracking-tight">Level {level}</h2>
          <span className="text-[13px] font-bold text-ink/60">
            {Math.max(0, LEVEL_XP - levelXp)} XP to level {level + 1}
          </span>
        </div>
        <span className="text-[14px] font-black tabular-nums">
          {levelXp}
          <span className="text-ink/55"> / {LEVEL_XP} XP</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Level progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="relative h-4 overflow-hidden rounded-full bg-accent-softer"
      >
        <motion.div
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-main"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.45 }}
        >
          <span className="qc-shine absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}

const stickerStyle: Record<Rarity, { fill: string; icon: typeof Gem; label: string }> = {
  COMMON: { fill: "bg-white text-ink", icon: Star, label: "Common" },
  RARE: { fill: "bg-[#6B3FD6] text-white", icon: Gem, label: "Rare" },
  EPIC: { fill: "bg-main text-ink shadow-[0_0_28px_-2px_rgb(255_184_0/0.75)]", icon: Sparkles, label: "Epic" },
}

const tilt = [-4, 3, -2, 4, -3]

function ChogPhoto({ image, chogLabel, className }: { image: string | null; chogLabel: string; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.5, rotate: 20 }}
      animate={{ scale: 1, rotate: 6 }}
      whileHover={{ rotate: -2, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.2 }}
      className={cn("flex-none", className)}
    >
      <div className="qc-bob" style={{ "--qc-bob": "4.2s" } as React.CSSProperties}>
        <NftImage
          src={image}
          alt={chogLabel}
          label="CHOG"
          className="size-[92px] rounded-[24px] border-[5px] border-white text-ink shadow-[0_16px_30px_-12px_rgb(0_0_0/0.6)]"
        />
      </div>
    </motion.div>
  )
}

function NightCard({
  night,
  image,
  chogLabel,
  busy,
  onClaim,
}: {
  night: NightView
  image: string | null
  chogLabel: string
  busy: boolean
  onClaim: (button: HTMLElement) => void
}) {
  const expires = new Date(night.expiresAt)
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(expires))
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(formatTimeLeft(new Date(night.expiresAt))), 30_000)
    return () => clearInterval(t)
  }, [night.expiresAt])

  const count = night.items.length
  const label = night.claimed
    ? "Claimed"
    : night.claimable
      ? `Claim ${count} item${count === 1 ? "" : "s"}`
      : "Slipped away"
  const footer = night.claimed
    ? "Safe in your Chronicle"
    : night.claimable
      ? `${timeLeft} left to claim`
      : "Moved to Lost and Found"
  const faded = !night.claimed && !night.claimable

  return (
    <section
      aria-labelledby="night-title"
      className="relative overflow-hidden rounded-[36px] bg-[#1E1638] px-5 pt-5 pb-24 text-white shadow-[0_30px_60px_-28px_rgb(30_22_56/0.8)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(139_108_255/0.45),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 -right-20 size-60 rounded-full bg-[radial-gradient(closest-side,rgb(255_184_0/0.16),transparent)]"
      />
      <ChogHair className="absolute inset-x-0 bottom-0 h-[92px] w-full" />

      <div className="relative flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-extrabold text-main">
              <Moon className="size-3.5" strokeWidth={3} aria-hidden="true" />
              Night {night.number}
            </span>
            {night.claimed && (
              <span className="flex items-center gap-1 rounded-full bg-[#1F9D5C] px-2.5 py-1 text-[12px] font-extrabold text-white">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                Claimed
              </span>
            )}
          </div>
          <h2 id="night-title" className="text-[24px] leading-[1.1] font-black tracking-tight">
            {night.title}
          </h2>
        </div>
        <ChogPhoto image={image} chogLabel={chogLabel} className="-mt-1 -mr-1" />
      </div>

      <p className="relative mt-4 text-[16px] leading-relaxed font-semibold text-white/80">{night.diary}</p>

      <div className="relative mt-5">
        <p className="mb-2.5 text-[12px] font-extrabold tracking-wide text-white/65 uppercase">Brought home</p>
        <motion.ul
          className={cn("flex flex-wrap gap-2.5", faded && "opacity-60")}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } } }}
        >
          {night.items.map((item, i) => {
            const s = stickerStyle[item.rarity]
            const Icon = s.icon
            const r = tilt[i % tilt.length]
            return (
              <motion.li
                key={`${item.id}-${i}`}
                variants={{
                  hidden: { opacity: 0, scale: 0.3, y: 24, rotate: r * 4 },
                  show: { opacity: 1, scale: 1, y: 0, rotate: r },
                }}
                whileHover={{ scale: 1.07, rotate: -r }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 14 }}
                className={cn(
                  "flex items-center gap-2 rounded-[18px] border-[3px] border-white py-2 pr-3.5 pl-2.5",
                  s.fill,
                )}
              >
                <Icon className="size-[18px] flex-none" strokeWidth={2.75} aria-hidden="true" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[15px] font-black">{item.name}</span>
                  <span className="text-[11px] font-extrabold tracking-wide uppercase opacity-80">{s.label}</span>
                </span>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>

      <div className="relative mt-6 flex flex-col gap-2.5">
        <Magnetic className="flex flex-col">
          <Button
            size="lg"
            className={cn(
              "relative min-h-14 w-full gap-2 overflow-hidden rounded-full text-[17px] font-black data-disabled:opacity-100",
              night.claimable
                ? "bg-main text-ink shadow-[0_12px_32px_-10px_rgb(255_184_0/0.9)]"
                : "bg-white/12 text-white shadow-none hover:translate-y-0",
            )}
            onClick={(e) => onClaim(e.currentTarget)}
            disabled={!night.claimable || busy}
          >
            {night.claimable && !busy && (
              <span
                aria-hidden="true"
                className="qc-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
              />
            )}
            {night.claimed && <Check className="size-5" strokeWidth={3} aria-hidden="true" />}
            <span className="relative">{busy ? "Confirm in your wallet..." : label}</span>
          </Button>
        </Magnetic>
        <p className="flex items-center justify-center gap-1.5 text-center text-[14px] font-bold text-white/75">
          {night.claimable && <Clock className="size-4" strokeWidth={2.75} aria-hidden="true" />}
          {footer}
        </p>
        {night.txHash && (
          <a
            href={explorerTx(night.txHash)}
            target="_blank"
            rel="noreferrer"
            className="mx-auto max-w-full truncate rounded-full px-2 py-1 text-center text-[13px] font-bold text-main underline underline-offset-2"
            title={night.txHash}
          >
            View on Monad: {night.txHash}
          </a>
        )}
      </div>
    </section>
  )
}

function TonightCard({ image, chogLabel }: { image: string | null; chogLabel: string }) {
  return (
    <section className="relative overflow-hidden rounded-[36px] bg-[#1E1638] px-5 pt-5 pb-24 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(139_108_255/0.45),transparent)]"
      />
      <ChogHair className="absolute inset-x-0 bottom-0 h-[92px] w-full" />
      <div className="relative flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-2.5">
          <span className="flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1 text-[13px] font-extrabold text-main">
            <Moon className="size-3.5" strokeWidth={3} aria-hidden="true" />
            Tonight
          </span>
          <h2 className="text-[24px] leading-[1.1] font-black tracking-tight">Your Chog heads out tonight.</h2>
        </div>
        <ChogPhoto image={image} chogLabel={chogLabel} />
      </div>
      <p className="relative mt-4 text-[16px] font-semibold text-white/80">
        Its first diary page arrives in the morning.
      </p>
    </section>
  )
}
