"use client"

import { useState } from "react"

import { useAppState } from "@/components/game/app-state"
import { Gate } from "@/components/game/gate"
import { NftImage } from "@/components/game/nft-image"
import { rarityFill } from "@/components/game/rarity"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { api, errorMessage } from "@/lib/client"
import { explorerAddress } from "@/lib/contracts"
import { LEVEL_XP } from "@/lib/xp"
import { cn } from "@/lib/utils"

export default function ChogSheet() {
  return (
    <Gate>
      {(state) => {
        const { chog } = state
        const stats = [
          { value: chog.nights, label: "NIGHTS", fill: "bg-main" },
          { value: chog.items, label: "ITEMS", fill: "bg-green" },
          { value: chog.rare, label: "RARE", fill: "bg-red" },
        ]

        return (
          <>
            <h1 className="font-pixel text-lg font-bold">CHOG SHEET</h1>

            <section className="flex gap-3.5 rounded-base border-2 border-border bg-secondary-background p-3.5 shadow-shadow">
              <NftImage src={chog.image} alt={chog.name} className="size-24 flex-none text-[11px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="font-pixel text-lg font-bold">CHOG #{chog.tokenId}</div>
                <div className="self-start rounded-full border-2 border-border bg-yellow px-2 py-0.5 font-pixel text-xs font-bold">
                  LV {chog.level} PARTY
                </div>
                <div className="text-[13px] font-bold">
                  Streak {chog.streak} {chog.streak === 1 ? "day" : "days"}
                  {chog.sleepInAvailable ? " // sleep-in ready" : ""}
                </div>
                <Progress value={chog.levelPct} aria-label="Level progress" indicatorClassName="bg-yellow" />
                <div className="font-pixel text-[11px] font-bold">
                  {chog.levelXp} / {LEVEL_XP} XP
                </div>
              </div>
            </section>

            <div className="flex gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    "flex-1 rounded-base border-2 border-border p-2.5 text-center shadow-shadow",
                    s.fill,
                  )}
                >
                  <div className="font-pixel text-[22px] font-bold">{s.value}</div>
                  <div className="text-xs font-bold">{s.label}</div>
                </div>
              ))}
            </div>

            <h2 className="font-pixel text-[13px] font-bold">INVENTORY</h2>
            {state.inventory.length === 0 ? (
              <p className="rounded-base border-2 border-dashed border-border bg-secondary-background p-3 text-sm font-bold">
                Empty for now. Claim a night to fill it.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2.5">
                {state.inventory.map((item) => (
                  <li
                    key={item.id}
                    className={cn("min-h-19 rounded-base border-2 border-border p-2", rarityFill[item.rarity])}
                  >
                    <div className="text-[13px] leading-tight font-bold">{item.name}</div>
                    <div className="mt-1 flex justify-between font-pixel text-[10px] font-bold">
                      <span>{item.rarity}</span>
                      {item.count > 1 && <span>X{item.count}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <section className="rounded-base border-2 border-border bg-secondary-background p-3 text-sm">
              <h2 className="mb-1 font-pixel text-xs font-bold">FOLLOWS THE CHOG</h2>
              Everything here is recorded against Chog #{chog.tokenId}. If the Chog moves to a new wallet, its
              inventory goes with it.
              <a
                href={explorerAddress(state.chronicle.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs underline"
                title={state.chronicle.address}
              >
                Chronicle on Monad testnet: {state.chronicle.address}
              </a>
            </section>

            {state.lostAndFound.items.length > 0 && (
              <section className="rounded-base border-2 border-border bg-yellow p-3 text-sm shadow-shadow">
                <p className="font-bold">
                  LOST AND FOUND: {state.lostAndFound.items.length}{" "}
                  {state.lostAndFound.items.length === 1 ? "item" : "items"} from last week slipped away. See what
                  Chog was up to.
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {state.lostAndFound.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className={cn("rounded-full border-2 border-border px-2 py-0.5 text-xs font-bold", rarityFill[it.rarity])}
                    >
                      {it.name}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <TelegramLink linked={state.user.telegramLinked} muted={state.user.telegramMuted} />
            <DeleteData />
          </>
        )
      }}
    </Gate>
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

  return (
    <section className="flex flex-col gap-2 rounded-base border-2 border-border bg-secondary-background p-3 text-sm">
      <h2 className="font-pixel text-xs font-bold">TELEGRAM</h2>
      {linked && !muted ? (
        <p>Linked. Each evening the bot lets you know when your Chog&apos;s items are waiting, with a Claim button.</p>
      ) : code ? (
        code.url ? (
          <>
            <p>Open the bot and press Start. That links it. The link works for 15 minutes.</p>
            <a
              href={code.url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "neutral" }), "w-full")}
            >
              OPEN TELEGRAM
            </a>
          </>
        ) : (
          <p>
            Send <span className="font-pixel font-bold">/start {code.code}</span> to the Quest Chog bot within 15
            minutes.
          </p>
        )
      ) : (
        <>
          <p>
            {muted
              ? "Nudges are muted. Link again to turn them back on."
              : "Get one evening message when your Chog's items are waiting, with a Claim button."}
          </p>
          <Button variant="neutral" onClick={makeCode}>
            LINK TELEGRAM
          </Button>
        </>
      )}
      {error && <p role="alert" className="font-bold text-red">{error}</p>}
    </section>
  )
}

function DeleteData() {
  const { refresh } = useAppState()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <section className="flex flex-col gap-2 rounded-base border-2 border-border bg-secondary-background p-3 text-sm">
      <h2 className="font-pixel text-xs font-bold">YOUR DATA</h2>
      <p>Goals and check-in notes are encrypted. Delete removes them for good. XP and items stay with the Chog.</p>
      {done ? (
        <p className="font-bold">Deleted.</p>
      ) : (
        <Button
          variant="neutral"
          className={cn(confirm && "bg-red")}
          onClick={async () => {
            if (!confirm) return setConfirm(true)
            await api("/api/me/data", { method: "DELETE" })
            setDone(true)
            await refresh()
          }}
        >
          {confirm ? "TAP AGAIN TO DELETE" : "DELETE MY DATA"}
        </Button>
      )}
    </section>
  )
}
