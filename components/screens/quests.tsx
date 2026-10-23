"use client"

import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check, Lock, Minus, Plus, Sparkles, Swords, Trophy, User, X } from "lucide-react"
import { useState } from "react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { useAppState } from "@/components/game/app-state"
import { NftImage } from "@/components/game/nft-image"
import { EmptyCard } from "@/components/screens/empty"
import { FillBar, PillTabs, Rise, Screen, ScreenHeader, bouncy, spring } from "@/components/screens/kit"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api, errorMessage } from "@/lib/client"
import type { AppState, QuestView } from "@/lib/state-types"
import { MAX_GOALS, questReward } from "@/lib/xp"
import { cn } from "@/lib/utils"

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }
type Side = "you" | "chog"

export function QuestsScreen({ state }: { state: Ready }) {
  const [side, setSide] = useState<Side>("you")
  const yours = state.quests.filter((q) => q.owner === "you")
  const chogs = state.quests.filter((q) => q.owner === "chog")
  const activeCount = yours.filter((q) => q.status === "active").length
  const list = side === "you" ? yours : chogs

  return (
    <Screen>
      <ScreenHeader title="Quests" kicker="Private. Only you see these." headColor="#FFB800" />

      <Rise>
        <PartyBanner state={state} yours={activeCount} chogs={chogs.filter((q) => q.status === "active").length} />
      </Rise>

      {state.lastCompleted && (
        <Rise>
          <QuestComplete done={state.lastCompleted} chogImage={state.chog.image} chogName={state.chog.name} />
        </Rise>
      )}

      <Rise className="flex flex-col gap-4">
        <PillTabs
          idPrefix="quests"
          label="Whose quests"
          value={side}
          onChange={setSide}
          options={[
            { value: "you", label: "Yours", icon: <User strokeWidth={3} />, count: yours.length },
            { value: "chog", label: "Chog's", icon: <Swords strokeWidth={3} />, count: chogs.length },
          ]}
        />

        <div
          role="tabpanel"
          id="quests-panel"
          aria-labelledby={`quests-tab-${side}`}
          className="focus-visible:outline-none"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.ul
              key={side}
              className="grid grid-cols-1 gap-3.5 @2xl:grid-cols-2"
              initial={{ opacity: 0, x: side === "you" ? -36 : 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: side === "you" ? -36 : 36, transition: { duration: 0.15 } }}
              transition={spring}
            >
              {list.length === 0 ? (
                <li className="@2xl:col-span-2">
                  {side === "you" ? (
                    <EmptyCard
                      icon={<Swords strokeWidth={2.5} />}
                      title="No quests yet"
                      body="Add a goal below. Your Chog picks a quest of its own to match."
                    />
                  ) : (
                    <EmptyCard
                      icon={<Sparkles strokeWidth={2.5} />}
                      title="Your Chog is waiting"
                      body="Start a quest of your own and your Chog takes one on too."
                    />
                  )}
                </li>
              ) : (
                list.map((q, i) => (
                  <QuestCard key={q.id} quest={q} index={i} chogImage={state.chog.image} chogName={state.chog.name} />
                ))
              )}
            </motion.ul>
          </AnimatePresence>
        </div>
      </Rise>

      <Rise>
        <NewQuest disabled={activeCount >= MAX_GOALS} />
      </Rise>
    </Screen>
  )
}

/** The two-sided party: you on one side, your Chog on the other. */
function PartyBanner({ state, yours, chogs }: { state: Ready; yours: number; chogs: number }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-accent-soft p-4">
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <motion.div
            className="sticker flex size-20 -rotate-6 items-center justify-center rounded-[26px] border-[5px] border-white bg-main"
            animate={reduce ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <User className="size-9 text-ink" strokeWidth={2.5} aria-hidden="true" />
          </motion.div>
          <div>
            <p className="text-[15px] font-black">You</p>
            <p className="text-[13px] font-bold text-ink/70">
              {yours} of {MAX_GOALS} active
            </p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-shadow"
        >
          <Plus className="size-5" strokeWidth={3.5} />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <motion.div
            className="sticker rotate-6 rounded-[26px] border-[5px] border-white"
            animate={reduce ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          >
            <NftImage
              src={state.chog.image}
              alt={state.chog.name}
              className="size-[70px] rounded-[20px] border-0 text-[9px]"
            />
          </motion.div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black">{state.chog.label}</p>
            <p className="text-[13px] font-bold text-ink/70">
              {chogs} {chogs === 1 ? "quest" : "quests"} active
            </p>
          </div>
        </div>
      </div>
      <p className="relative mt-3 text-center text-[13px] font-extrabold text-ink/70">
        You complete yours. It completes its. You all win.
      </p>
    </div>
  )
}

function QuestCard({
  quest,
  index,
  chogImage,
  chogName,
}: {
  quest: QuestView
  index: number
  chogImage: string | null
  chogName: string
}) {
  const chog = quest.owner === "chog"
  const done = quest.status === "done"
  const dropped = quest.status === "dropped"
  const pct = quest.stepsTotal > 0 ? (quest.stepsDone / quest.stepsTotal) * 100 : 0

  return (
    <motion.li
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: 0.05 + index * 0.06 }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative flex flex-col gap-3.5 overflow-hidden rounded-[30px] p-5",
        chog ? "bg-[#F1ECFF]" : "bg-white shadow-shadow",
        dropped && "opacity-70",
      )}
    >
      {chog && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-3 -right-10 size-32 rotate-[-20deg] opacity-25">
          <ChogLetter letter="O" color="#8B6CFF" className="size-full" />
        </div>
      )}

      <div className="relative flex items-start gap-3">
        {chog ? (
          <NftImage src={chogImage} alt={chogName} className="size-11 flex-none rounded-[14px] border-0 text-[7px]" />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-main text-ink"
          >
            <Swords className="size-5" strokeWidth={2.5} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-snug font-black break-words">{quest.name}</h3>
          <p className="mt-0.5 text-[13px] font-bold text-ink/70">
            {quest.stepsDone} of {quest.stepsTotal} check-ins
          </p>
        </div>
        <StatusChip quest={quest} />
      </div>

      {quest.stepsTotal <= 14 ? (
        <Pips quest={quest} chog={chog} />
      ) : (
        <FillBar
          value={pct}
          label={`${quest.name} progress`}
          fill={done ? "bg-green" : chog ? "bg-violet" : "bg-main"}
        />
      )}

      <div className="relative flex items-center justify-between gap-2">
        {quest.checkedInToday && !done ? (
          <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-[#17633C]">
            <Check className="size-4" strokeWidth={3} aria-hidden="true" /> Checked in today
          </span>
        ) : (
          <span className="text-[13px] font-bold text-ink/70">{chog ? "Your Chog's side" : "Your side"}</span>
        )}
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[13px] font-black tabular-nums",
            chog ? "bg-violet/15 text-[#4B2A9E]" : "bg-main/20 text-ink",
          )}
        >
          +{quest.xpReward} XP
        </span>
      </div>
    </motion.li>
  )
}

function StatusChip({ quest }: { quest: QuestView }) {
  if (quest.status === "done") {
    return (
      <span className="inline-flex flex-none items-center gap-1 rounded-full bg-green px-2.5 py-1 text-[12px] font-black text-ink">
        <Trophy className="size-3.5" strokeWidth={3} aria-hidden="true" /> Done
      </span>
    )
  }
  if (quest.status === "dropped") {
    return <span className="flex-none rounded-full bg-ink/8 px-2.5 py-1 text-[12px] font-black">Dropped</span>
  }
  return (
    <span className="flex-none rounded-full bg-ink px-2.5 py-1 text-[12px] font-black text-main">Active</span>
  )
}

/** One pip per check-in. Done pips pop in one after another. */
function Pips({ quest, chog }: { quest: QuestView; chog: boolean }) {
  const done = quest.status === "done"
  const on = done ? "bg-green" : chog ? "bg-violet" : "bg-main"
  return (
    <div
      role="progressbar"
      aria-label={`${quest.name} progress`}
      aria-valuemin={0}
      aria-valuemax={quest.stepsTotal}
      aria-valuenow={quest.stepsDone}
      aria-valuetext={`${quest.stepsDone} of ${quest.stepsTotal} check-ins`}
      className="relative flex gap-1.5"
    >
      {Array.from({ length: quest.stepsTotal }, (_, i) => {
        const filled = i < quest.stepsDone
        return (
          <div key={i} className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-ink/8">
            {filled && (
              <motion.span
                className={cn("absolute inset-0 rounded-full", on)}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                style={{ originX: 0 }}
                transition={{ ...bouncy, delay: 0.3 + i * 0.08 }}
              >
                <span className="absolute inset-x-1 top-[3px] h-[3px] rounded-full bg-white/45" />
              </motion.span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The quest-complete moment: a night-sky card that invites a share. */
function QuestComplete({
  done,
  chogImage,
  chogName,
}: {
  done: NonNullable<AppState["lastCompleted"]>
  chogImage: string | null
  chogName: string
}) {
  const reduce = useReducedMotion()
  return (
    <div className="relative overflow-hidden rounded-[36px] bg-[#1E1638] p-5 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-10 size-40 rotate-12 opacity-20">
        <ChogLetter letter="O" color="#FFB800" className="size-full" />
      </div>
      <div className="relative flex items-start gap-4">
        <motion.div
          className="sticker flex size-16 flex-none items-center justify-center rounded-[22px] border-[4px] border-white bg-main"
          initial={{ scale: 0, rotate: -40 }}
          animate={reduce ? { scale: 1, rotate: -8 } : { scale: 1, rotate: [-8, 4, -8] }}
          transition={{
            scale: { ...bouncy, delay: 0.35 },
            rotate: reduce ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <Trophy className="size-8 text-ink" strokeWidth={2.5} aria-hidden="true" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-main">Quest complete</p>
          <p className="mt-0.5 text-xl leading-tight font-black break-words">{done.name}</p>
          <p className="mt-1 text-[14px] font-bold text-white/75">
            +{done.xpReward} XP
            {done.chogQuest
              ? done.chogQuest.done
                ? `. Your Chog finished "${done.chogQuest.name}" too.`
                : `. Your Chog is still on "${done.chogQuest.name}".`
              : "."}
          </p>
        </div>
        <NftImage
          src={chogImage}
          alt={chogName}
          className="hidden size-14 flex-none rotate-6 rounded-[18px] border-[3px] border-white text-[7px] @sm:flex"
        />
      </div>
      <Link
        href="/app/share?card=QUEST"
        className={cn(buttonVariants({ size: "lg" }), "relative mt-4 min-h-12 w-full text-[15px]")}
      >
        Make a card <ArrowRight strokeWidth={3} />
      </Link>
    </div>
  )
}

const PRESETS = [3, 5, 7, 10]

function NewQuest({ disabled }: { disabled: boolean }) {
  const { refresh } = useAppState()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [steps, setSteps] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reward = questReward(steps || 1)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api("/api/goals", { body: { title, stepsTotal: steps } })
      await refresh()
      setTitle("")
      setSteps(3)
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const clamp = (n: number) => Math.max(1, Math.min(30, n))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col items-center gap-2">
        <DialogTrigger
          disabled={disabled}
          className={cn(buttonVariants({ size: "lg" }), "min-h-14 w-full text-[16px] [&_svg]:size-5")}
        >
          {disabled ? (
            <>
              <Lock strokeWidth={3} /> {MAX_GOALS} quests active
            </>
          ) : (
            <>
              <Plus strokeWidth={3} /> New quest
            </>
          )}
        </DialogTrigger>
        {disabled && (
          <p className="text-[13px] font-bold text-ink/70">Finish one to start another.</p>
        )}
      </div>
      <DialogContent
        showCloseButton={false}
        className="max-w-[380px] gap-0 overflow-hidden rounded-[36px] border-0 bg-cream p-0 sm:max-w-[400px]"
      >
        <div className="relative h-24 overflow-hidden bg-main">
          <motion.div
            aria-hidden="true"
            className="absolute -bottom-12 left-1/2 size-36 -translate-x-1/2"
            initial={{ y: 60, rotate: -20 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ ...bouncy, delay: 0.1 }}
          >
            <ChogLetter letter="O" tone="ink" className="size-full" />
          </motion.div>
          <DialogClose
            aria-label="Close"
            className="absolute top-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/70 text-ink backdrop-blur-md hover:bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <X className="size-5" strokeWidth={3} />
          </DialogClose>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-5 p-6 pt-5">
          <div className="text-center">
            <DialogTitle className="font-pixel text-2xl font-black">New quest</DialogTitle>
            <DialogDescription className="mt-1 text-[14px] font-bold text-ink/70">
              Stays private. Never goes on-chain.
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="quest-title" className="text-[14px] font-black">
              Your goal
            </label>
            <input
              id="quest-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to get done?"
              className="min-h-13 w-full rounded-[18px] border-2 border-transparent bg-white px-4 text-base font-bold shadow-shadow placeholder:text-ink/45 focus-visible:border-main focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="quest-steps" className="text-[14px] font-black">
              Check-ins to finish
            </label>
            <div className="flex items-center gap-2 rounded-[22px] bg-white p-1.5 shadow-shadow">
              <button
                type="button"
                aria-label="Fewer check-ins"
                onClick={() => setSteps((s) => clamp((s || 1) - 1))}
                disabled={steps <= 1}
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full bg-ink/8 hover:bg-ink/12 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
              >
                <Minus className="size-5" strokeWidth={3} />
              </button>
              <input
                id="quest-steps"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                required
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="min-h-11 w-full min-w-0 bg-transparent text-center text-2xl font-black tabular-nums [appearance:textfield] focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label="More check-ins"
                onClick={() => setSteps((s) => clamp((s || 0) + 1))}
                disabled={steps >= 30}
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full bg-main hover:brightness-105 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
              >
                <Plus className="size-5" strokeWidth={3} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5" role="group" aria-label="Quick picks">
                {PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={steps === n}
                    onClick={() => setSteps(n)}
                    className={cn(
                      "min-h-11 min-w-11 cursor-pointer rounded-full text-[14px] font-black transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                      steps === n ? "bg-ink text-main" : "bg-ink/8 hover:bg-ink/12",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <motion.span
                key={reward}
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={bouncy}
                className="rounded-full bg-violet/15 px-3 py-1.5 text-[14px] font-black whitespace-nowrap text-[#4B2A9E]"
                aria-live="polite"
              >
                +{reward} XP
              </motion.span>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-[16px] bg-red/15 px-3 py-2 text-sm font-bold text-[#9A2416]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(buttonVariants({ size: "lg" }), "min-h-14 w-full text-[16px]")}
          >
            {busy ? "Saving..." : "Start the quest"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
