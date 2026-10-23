"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useState } from "react"

import { useAppState } from "@/components/game/app-state"
import { Gate, Notice } from "@/components/game/gate"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, errorMessage } from "@/lib/client"
import type { QuestView } from "@/lib/state-types"
import { MAX_GOALS, questReward } from "@/lib/xp"
import { cn } from "@/lib/utils"

export default function Quests() {
  return (
    <Gate>
      {(state) => {
        const yours = state.quests.filter((q) => q.owner === "you")
        const chogs = state.quests.filter((q) => q.owner === "chog")
        const activeCount = yours.filter((q) => q.status === "active").length

        return (
          <>
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-pixel text-lg font-bold">QUESTS</h1>
              <div className="text-[13px] font-bold">Private. Only you see these.</div>
            </div>

            <Tabs defaultValue="you" className="flex flex-col gap-4">
              <TabsList className="h-auto w-full gap-0 overflow-hidden p-0 shadow-shadow">
                <TabsTrigger
                  value="you"
                  className="min-h-11 flex-1 rounded-none border-0 border-r-2 border-border font-pixel text-[13px] font-bold data-active:border-border data-[active]:bg-main"
                >
                  YOURS
                </TabsTrigger>
                <TabsTrigger
                  value="chog"
                  className="min-h-11 flex-1 rounded-none border-0 font-pixel text-[13px] font-bold data-[active]:bg-main"
                >
                  CHOG&apos;S
                </TabsTrigger>
              </TabsList>
              <TabsContent value="you" className="mt-0 flex flex-col gap-4">
                {yours.length === 0 && (
                  <Notice title="NO QUESTS YET" body="Add a goal. Your Chog gets its own quest to match." />
                )}
                {yours.map((q) => (
                  <QuestCard key={q.id} quest={q} bar="bg-main" />
                ))}
              </TabsContent>
              <TabsContent value="chog" className="mt-0 flex flex-col gap-4">
                {chogs.map((q) => (
                  <QuestCard key={q.id} quest={q} bar="bg-green" />
                ))}
              </TabsContent>
            </Tabs>

            <NewQuest disabled={activeCount >= MAX_GOALS} />

            {state.lastCompleted && (
              <Link
                href="/app/share?card=QUEST"
                className={cn(buttonVariants({ size: "lg" }), "min-h-12 bg-yellow text-[13px]")}
              >
                QUEST COMPLETE: MAKE A CARD
              </Link>
            )}
          </>
        )
      }}
    </Gate>
  )
}

function NewQuest({ disabled }: { disabled: boolean }) {
  const { refresh } = useAppState()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [steps, setSteps] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        className={cn(buttonVariants({ size: "lg" }), "min-h-13 text-[15px]")}
      >
        <Plus strokeWidth={3} /> {disabled ? `${MAX_GOALS} QUESTS ACTIVE` : "NEW QUEST"}
      </DialogTrigger>
      <DialogContent className="max-w-[358px]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="font-pixel">NEW QUEST</DialogTitle>
            <DialogDescription>Stays private. Never goes on-chain.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-title" className="font-bold">
              Your goal
            </Label>
            <Input
              id="quest-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to get done?"
              className="min-h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-steps" className="font-bold">
              Check-ins to finish
            </Label>
            <Input
              id="quest-steps"
              type="number"
              min={1}
              max={30}
              required
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="min-h-12 text-base"
            />
            <span className="font-pixel text-xs font-bold">REWARD +{questReward(steps || 1)} XP</span>
          </div>
          {error && <p role="alert" className="text-sm font-bold text-red">{error}</p>}
          <DialogFooter>
            <Button type="submit" size="lg" className="min-h-13 w-full" disabled={busy}>
              {busy ? "SAVING..." : "START THE QUEST"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuestCard({ quest, bar }: { quest: QuestView; bar: string }) {
  const complete = quest.status === "done"
  const pct = Math.round((quest.stepsDone / quest.stepsTotal) * 100)

  return (
    <div className="flex flex-col gap-2.5 rounded-base border-2 border-border bg-secondary-background p-3.5 shadow-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[17px] font-bold">{quest.name}</div>
        <div
          className={cn(
            "flex-none rounded-full border-2 border-border px-2 py-0.5 font-pixel text-[11px] font-bold",
            complete ? "bg-green" : "bg-main",
          )}
        >
          {complete ? "DONE" : "ACTIVE"}
        </div>
      </div>
      <Progress
        value={pct}
        aria-label={`${quest.name} progress`}
        indicatorClassName={complete ? "bg-green" : bar}
      />
      <div className="flex justify-between text-[13px] font-bold">
        <span>
          {quest.stepsDone} of {quest.stepsTotal} check-ins
        </span>
        <span className="font-pixel text-xs">+{quest.xpReward} XP</span>
      </div>
    </div>
  )
}
