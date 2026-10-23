"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { NftImage } from "@/components/game/nft-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, api, errorMessage, signIn } from "@/lib/client"
import { cn } from "@/lib/utils"

type ChogMeta = { tokenId: number; name: string; image: string | null }

const heading = "font-pixel text-[28px] leading-tight font-bold"
const bigButton = "min-h-13 w-full text-base"

export default function Start() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chogs, setChogs] = useState<ChogMeta[] | null>(null)
  const [manual, setManual] = useState(false)
  const [tokenInput, setTokenInput] = useState("")
  const [picked, setPicked] = useState<number | null>(null)
  const [goal, setGoal] = useState("")
  const [steps, setSteps] = useState(3)
  const [chogQuest, setChogQuest] = useState<string | null>(null)

  async function guard(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    guard(async () => {
      await signIn()
      try {
        const res = await api<{ chogs: ChogMeta[]; activeChog: number | null }>("/api/chogs")
        setChogs(res.chogs)
        setPicked(res.activeChog ?? res.chogs[0]?.tokenId ?? null)
      } catch (err) {
        // The NFT contract may not support listing by owner. Fall back to typing the ID.
        if (err instanceof ApiError && err.status === 501) {
          setChogs([])
          setManual(true)
        } else throw err
      }
      setStep(2)
    })

  const choose = () =>
    guard(async () => {
      const tokenId = manual ? Number(tokenInput) : picked
      if (tokenId === null || !Number.isInteger(tokenId)) throw new Error("Pick a Chog first.")
      await api("/api/chog/select", { body: { tokenId } })
      const state = await api<{ quests: { owner: string; status: string; name: string }[] }>("/api/state")
      const yours = state.quests.filter((q) => q.owner === "you" && q.status === "active")
      if (yours.length > 0) return router.push("/app")
      setChogQuest(state.quests.find((q) => q.owner === "chog" && q.status === "active")?.name ?? null)
      setStep(3)
    })

  const start = () =>
    guard(async () => {
      await api("/api/goals", { body: { title: goal, stepsTotal: steps } })
      router.push("/app")
    })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-5 px-4 pt-5 pb-7 text-base leading-snug">
      <div className="flex items-center justify-between">
        {step === 1 ? (
          <Link href="/" className="inline-flex min-h-11 items-center font-pixel text-sm font-bold">
            &lt; BACK
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex min-h-11 cursor-pointer items-center font-pixel text-sm font-bold"
          >
            &lt; BACK
          </button>
        )}
        <div className="font-pixel text-sm font-bold">STEP {step} OF 3</div>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn(
              "h-3 flex-1 rounded-full border-2 border-border",
              n <= step ? "bg-main" : "bg-secondary-background",
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className={heading}>CLAIM YOUR CHOG</h1>
          <p>Connect the wallet that holds your Chog. Your quests and items follow the Chog, not you.</p>
          <Button size="lg" className={bigButton} onClick={connect} disabled={busy}>
            {busy ? "CHECK YOUR WALLET..." : "CONNECT WALLET"}
          </Button>
          <div className="flex flex-col gap-1.5 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow">
            <div className="font-pixel text-[13px] font-bold">PRIVATE BY DEFAULT</div>
            <div className="text-[15px]">Your goals never go on-chain. Only XP, level and items do.</div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className={heading}>PICK YOUR CHOG</h1>
          {manual ? (
            <>
              <p>Enter the token ID of the Chog in your wallet. We check that you hold it.</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="token" className="font-bold">
                  Chog token ID
                </Label>
                <Input
                  id="token"
                  inputMode="numeric"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ""))}
                  className="min-h-12 text-base"
                />
              </div>
            </>
          ) : chogs && chogs.length === 0 ? (
            <p>
              No Chogs found in this wallet. Quest Chog needs a Chog NFT: its items, XP and streak are recorded
              against it.
            </p>
          ) : (
            <>
              <p>
                We found {chogs?.length} {chogs?.length === 1 ? "Chog" : "Chogs"} in your wallet. Choose the one
                you are questing with.
              </p>
              <div role="radiogroup" aria-label="Your Chogs" className="flex flex-col gap-4">
                {chogs?.map((c) => (
                  <button
                    key={c.tokenId}
                    type="button"
                    role="radio"
                    aria-checked={picked === c.tokenId}
                    onClick={() => setPicked(c.tokenId)}
                    className={cn(
                      "flex min-h-24 cursor-pointer items-center gap-3.5 rounded-base border-2 border-border p-3 text-left shadow-shadow",
                      picked === c.tokenId ? "bg-yellow" : "bg-secondary-background",
                    )}
                  >
                    <NftImage src={c.image} alt={c.name} className="size-18 flex-none text-[10px]" />
                    <div>
                      <div className="font-pixel text-base font-bold">CHOG #{c.tokenId}</div>
                      <div className="text-sm">{c.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {!(chogs && chogs.length === 0 && !manual) && (
            <Button size="lg" className={bigButton} onClick={choose} disabled={busy}>
              {busy ? "CHECKING..." : "CONTINUE"}
            </Button>
          )}
          {!manual && (
            <button type="button" onClick={() => setManual(true)} className="min-h-11 cursor-pointer text-sm font-bold underline">
              Enter a token ID instead
            </button>
          )}
        </div>
      )}

      {step === 3 && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start()
          }}
        >
          <h1 className={heading}>SET YOUR FIRST GOAL</h1>
          <p>One goal is enough to start. Your Chog just picked one too.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal" className="text-base font-bold">
              Your goal
            </Label>
            <Input
              id="goal"
              required
              maxLength={120}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do you want to get done?"
              className="min-h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="steps" className="text-base font-bold">
              Check-ins to finish
            </Label>
            <Input
              id="steps"
              type="number"
              min={1}
              max={30}
              required
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="min-h-12 text-base"
            />
          </div>
          {chogQuest && (
            <div className="rounded-base border-2 border-border bg-yellow p-3.5 shadow-shadow">
              <div className="font-pixel text-xs font-bold">YOUR CHOG&apos;S GOAL</div>
              <div className="text-[17px] font-bold">{chogQuest}</div>
            </div>
          )}
          <Button type="submit" size="lg" className={cn(bigButton, "min-h-14")} disabled={busy}>
            {busy ? "SAVING..." : "START THE QUEST"}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-base border-2 border-border bg-red px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}
    </main>
  )
}
