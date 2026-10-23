"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { useAppState } from "@/components/game/app-state"
import { useBurst } from "@/components/fx/burst"
import { floatText } from "@/components/fx/float-number"
import { Magnetic } from "@/components/fx/magnetic"
import { CheckboxMark } from "@/components/game/checkbox-mark"
import { Gate, Notice } from "@/components/game/gate"
import { rarityFill } from "@/components/game/rarity"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { api, claimOnChain, errorMessage } from "@/lib/client"
import { explorerTx } from "@/lib/contracts"
import { dayNumber, formatTimeLeft } from "@/lib/days"
import type { NightView } from "@/lib/state-types"
import { CHECKIN_XP, LEVEL_XP } from "@/lib/xp"
import { cn } from "@/lib/utils"

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
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-pixel text-lg font-bold">TODAY</h1>
              <div className="rounded-base border-2 border-border bg-red px-2.5 py-1 font-pixel text-[13px] font-bold">
                STREAK {chog.streak}
              </div>
            </div>

            {night ? (
              <NightCard
                night={night}
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
                    return `CLAIMED. +${res.xpGain} XP. RECORDED ON MONAD.`
                  })
                }
              />
            ) : (
              <Notice title="TONIGHT" body="Your Chog heads out tonight. Its first diary page arrives in the morning." />
            )}

            <section className="flex flex-col gap-2.5">
              <h2 className="font-pixel text-[13px] font-bold">CHECK IN</h2>
              {yours.length === 0 && (
                <Notice title="NO GOALS YET" body="Set a goal to start checking in.">
                  <Link href="/app/quests" className={cn(buttonVariants(), "w-full")}>
                    SET A GOAL
                  </Link>
                </Notice>
              )}
              {yours.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  role="checkbox"
                  aria-checked={q.checkedInToday}
                  disabled={q.checkedInToday || busy !== null}
                  onClick={(e) => {
                    const mark = e.currentTarget.querySelector("[data-checkmark]")
                    run(
                      `checkin:${q.id}`,
                      async () => {
                        const res = await api<{ xp: number; questCompleted: boolean }>("/api/checkins", {
                          body: { goalId: q.id },
                        })
                        return res.questCompleted
                          ? `QUEST COMPLETE. +${res.xp} XP. MAKE A CARD.`
                          : `CHECKED IN. +${res.xp} XP.`
                      },
                      // Fires after refresh, in sync with the mark's pop.
                      () => burst(mark?.isConnected ? mark : null, "check"),
                    )
                  }}
                  className="flex min-h-15 cursor-pointer items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-left text-[15px] font-bold shadow-shadow disabled:cursor-default"
                >
                  <CheckboxMark checked={q.checkedInToday} pop />
                  <span className="flex-1">You: {q.name}</span>
                  <span className="font-pixel text-xs">+{CHECKIN_XP} XP</span>
                </button>
              ))}
              {chogQuest && (
                <div className="flex min-h-15 items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-[15px] font-bold shadow-shadow">
                  <CheckboxMark checked={chogQuest.checkedInToday} />
                  <span className="flex-1">
                    Chog: {chogQuest.name}
                    <span className="block text-xs font-medium">Moves when you check in</span>
                  </span>
                  <span className="font-pixel text-xs">
                    {chogQuest.stepsDone}/{chogQuest.stepsTotal}
                  </span>
                </div>
              )}
            </section>

            {message && (
              <p role="status" className="rounded-base border-2 border-border bg-yellow px-3 py-2 font-pixel text-xs font-bold">
                {message}
              </p>
            )}

            <section className="rounded-base border-2 border-border bg-secondary-background p-3">
              <div className="mb-1.5 flex justify-between font-pixel text-xs font-bold">
                <span>LV {chog.level}</span>
                <span>
                  {chog.levelXp} / {LEVEL_XP} XP
                </span>
              </div>
              <Progress value={chog.levelPct} aria-label="Level progress" indicatorClassName="bg-yellow" />
            </section>
          </>
        )
      }}
    </Gate>
  )
}

function NightCard({
  night,
  busy,
  onClaim,
}: {
  night: NightView
  busy: boolean
  onClaim: (button: HTMLElement) => void
}) {
  const expires = new Date(night.expiresAt)
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(expires))
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(formatTimeLeft(new Date(night.expiresAt))), 30_000)
    return () => clearInterval(t)
  }, [night.expiresAt])

  const label = night.claimed
    ? "CLAIMED"
    : night.claimable
      ? `CLAIM ${night.items.length} ITEM${night.items.length > 1 ? "S" : ""}`
      : "SLIPPED AWAY"
  const footer = night.claimed
    ? "SAFE IN YOUR CHRONICLE"
    : night.claimable
      ? `${timeLeft} LEFT TO CLAIM`
      : "MOVED TO LOST AND FOUND"

  return (
    <section className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow">
      <h2
        className={cn(
          "border-b-2 border-border px-3.5 py-2.5 font-pixel text-[13px] font-bold",
          night.rarityMax === "EPIC" ? "bg-yellow" : "bg-violet",
        )}
      >
        NIGHT {night.number}{" // "}{night.title}
      </h2>
      <div className="flex flex-col gap-3 p-3.5">
        <p className="text-[15px]">{night.diary}</p>
        <ul className="flex flex-col gap-2">
          {night.items.map((item, i) => (
            <li
              key={`${item.id}-${i}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-base border-2 border-border px-3 py-2",
                rarityFill[item.rarity],
              )}
            >
              <span className="text-[15px] font-bold">{item.name}</span>
              <span className="font-pixel text-[11px] font-bold">{item.rarity}</span>
            </li>
          ))}
        </ul>
        <Magnetic className="flex flex-col">
          <Button
            size="lg"
            className={cn(
              "min-h-13 text-base data-disabled:opacity-100",
              night.claimable ? "bg-green" : "bg-secondary-background",
            )}
            onClick={(e) => onClaim(e.currentTarget)}
            disabled={!night.claimable || busy}
          >
            {busy ? "CONFIRM IN WALLET..." : label}
          </Button>
        </Magnetic>
        <div className="text-center font-pixel text-xs font-bold">{footer}</div>
        {night.txHash && (
          <a
            href={explorerTx(night.txHash)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-center text-xs underline"
            title={night.txHash}
          >
            View on Monad testnet: {night.txHash}
          </a>
        )}
      </div>
    </section>
  )
}
