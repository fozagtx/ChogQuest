"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useModal } from "connectkit"
import { ArrowLeft, Hash, Loader2, Lock, Minus, Plus, Sparkles, Wallet } from "lucide-react"
import { AnimatePresence, motion, type Variants } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useAccount } from "wagmi"

import { ChogLetter, Wordmark } from "@/components/brand/chog-letter"
import { useBurst } from "@/components/fx/burst"
import { Magnetic } from "@/components/fx/magnetic"
import { prefersReducedMotion } from "@/components/fx/particles"
import { MotionRoot } from "@/components/landing/motion-root"
import { Backdrop } from "@/components/onboarding/backdrop"
import { ChogPick, TestBadge, type ChogMeta } from "@/components/onboarding/chog-card"
import { usePointerParallax } from "@/components/onboarding/pointer"
import { Stage } from "@/components/onboarding/stage"
import { StepIndicator } from "@/components/onboarding/step-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, api, errorMessage, mintTestChog, signIn } from "@/lib/client"
import { TEST_CHOG, chogLabel, isTestChog } from "@/lib/config"
import { cn } from "@/lib/utils"

const heading = "font-pixel text-[30px] leading-[1.05] font-black tracking-tight outline-none sm:text-[38px]"
const body = "text-[17px] font-semibold text-ink/70"
const bigButton = "min-h-14 w-full text-[17px]"
const field = "min-h-13 rounded-[18px] border-2 border-ink/10 bg-white px-4 text-base font-bold focus-visible:border-ink/30"

// Steps slide in the direction you are travelling.
const panel: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 56, rotate: dir * 1.5 }),
  center: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56, rotate: dir * -1.5, transition: { duration: 0.18, ease: "easeIn" } }),
}

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {children}
    </>
  )
}

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

  // Remember which way we moved so the panels slide forward or back.
  const [prevStep, setPrevStep] = useState(step)
  const [dir, setDir] = useState(1)
  if (step !== prevStep) {
    setPrevStep(step)
    setDir(step > prevStep ? 1 : -1)
  }

  const { mx, my } = usePointerParallax()
  const burst = useBurst()
  const mintRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLDivElement>(null)

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

  async function loadChogs() {
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
  }

  // ConnectKit opens its wallet picker; once a wallet is connected we ask for the sign-in signature.
  const { isConnected, address } = useAccount()
  const { setOpen } = useModal()
  const wantsSignIn = useRef(false)

  const finishSignIn = () =>
    guard(async () => {
      await signIn()
      await loadChogs()
      setStep(2)
    })

  const connect = () => {
    if (isConnected) return finishSignIn()
    wantsSignIn.current = true
    setOpen(true)
  }

  useEffect(() => {
    if (!wantsSignIn.current || !isConnected || !address) return
    wantsSignIn.current = false
    void finishSignIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the wallet connects
  }, [isConnected, address])

  const mintTest = () => {
    // The mint panel is replaced by the Chog grid afterwards, so remember where it was.
    const from = mintRef.current?.getBoundingClientRect()
    return guard(async () => {
      await mintTestChog()
      setManual(false)
      await loadChogs()
      burst(from, "epic")
    })
  }

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
      // A short beat so the confetti is seen before the app takes over.
      if (!prefersReducedMotion()) {
        burst(startRef.current, "epic")
        await new Promise((r) => setTimeout(r, 650))
      }
      router.push("/app")
    })

  const tokenId = manual ? (tokenInput ? Number(tokenInput) : null) : picked
  const pickedChog = manual ? null : (chogs?.find((c) => c.tokenId === picked) ?? null)
  const needsMint = !manual && chogs !== null && chogs.length === 0

  const backClass =
    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-white/70 px-4 text-[15px] font-extrabold shadow-shadow backdrop-blur-md transition hover:bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"

  return (
    <MotionRoot>
      <div className="relative isolate flex min-h-dvh flex-col">
        <Backdrop mx={mx} my={my} />

        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-10 lg:pt-6">
          <header className="flex items-center justify-between gap-3">
            {step === 1 ? (
              <Link href="/" className={backClass}>
                <ArrowLeft className="size-4" strokeWidth={3} aria-hidden="true" />
                Back
              </Link>
            ) : (
              <button type="button" onClick={() => setStep(step - 1)} className={backClass}>
                <ArrowLeft className="size-4" strokeWidth={3} aria-hidden="true" />
                Back
              </button>
            )}
            <Wordmark className="font-pixel text-xl font-black tracking-tight sm:text-2xl" />
            <div className="min-w-[76px] text-right text-[15px] font-extrabold text-ink/70" aria-live="polite">
              Step {step} of 3
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 pt-2 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12 lg:pt-0">
            <Stage step={step} chog={pickedChog} tokenId={tokenId} goal={goal} chogQuest={chogQuest} mx={mx} my={my} />

            <motion.section
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.1 }}
              className={cn("mx-auto w-full max-w-[480px] lg:max-w-[500px]", step !== 1 && "pt-4 lg:pt-0")}
            >
              <StepIndicator step={step} />

              <div className="relative mt-14">
                {/* A Chog head peeking over the top edge of the card. */}
                <motion.div
                  key={step}
                  aria-hidden="true"
                  className="absolute -top-[46px] right-7 z-0 size-20"
                  initial={{ y: 26, rotate: 20 }}
                  animate={{ y: 0, rotate: [20, -10, 6, 0] }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, rotate: { duration: 0.7, ease: "easeInOut" } }}
                >
                  <ChogLetter letter="O" className="size-full" />
                </motion.div>

                <div className="relative z-10 overflow-hidden rounded-[32px] bg-white/90 p-5 shadow-[0_30px_70px_-30px_rgb(26_18_0/0.35)] ring-1 ring-ink/5 backdrop-blur-xl sm:rounded-[40px] sm:p-8">
                  <AnimatePresence
                    mode="wait"
                    custom={dir}
                    initial={false}
                    onExitComplete={() => document.getElementById("step-heading")?.focus()}
                  >
                    <motion.div key={step} custom={dir} variants={panel} initial="enter" animate="center" exit="exit">
                      {step === 1 && (
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col gap-2.5">
                            <h1 id="step-heading" tabIndex={-1} className={heading}>
                              Claim your Chog
                            </h1>
                            <p className={body}>
                              Connect the wallet that holds your Chog. Your quests and items follow the Chog, not you.
                            </p>
                          </div>
                          <Magnetic>
                            <Button size="lg" className={bigButton} onClick={connect} disabled={busy}>
                              {busy ? <Busy>Check your wallet...</Busy> : <><Wallet aria-hidden="true" />Connect wallet</>}
                            </Button>
                          </Magnetic>
                          <div className="flex items-start gap-3.5 rounded-[24px] bg-accent-soft p-4">
                            <span className="flex size-11 flex-none items-center justify-center rounded-[16px] bg-violet">
                              <Lock className="size-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <div className="text-[15px] font-black">Private by default</div>
                              <div className="text-[15px] font-semibold text-ink/70">
                                Your goals never go on-chain. Only XP, level and items do.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="flex flex-col gap-5">
                          <h1 id="step-heading" tabIndex={-1} className={heading}>
                            Pick your Chog
                          </h1>
                          {manual ? (
                            <>
                              <p className={body}>Enter the token ID of the Chog in your wallet. We check that you hold it.</p>
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="token" className="text-[15px] font-black">
                                  Chog token ID
                                </Label>
                                <div className="relative">
                                  <Hash
                                    className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/60"
                                    aria-hidden="true"
                                  />
                                  <Input
                                    id="token"
                                    inputMode="numeric"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ""))}
                                    className={cn(field, "pl-11 text-lg")}
                                  />
                                </div>
                                {tokenInput && (
                                  <div className="flex items-center gap-2 text-[15px] font-extrabold">
                                    {chogLabel(Number(tokenInput))}
                                    {isTestChog(Number(tokenInput)) && <TestBadge />}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : needsMint ? (
                            <div className="flex flex-col gap-4">
                              <p className={body}>We could not find a Chog in this wallet.</p>
                              <div ref={mintRef} className="relative flex flex-col gap-3 overflow-hidden rounded-[28px] bg-accent-soft p-5">
                                <ChogLetter
                                  letter="O"
                                  color="#FFB800"
                                  className="pointer-events-none absolute -right-8 -bottom-10 size-36 rotate-12 opacity-30"
                                />
                                <div className="relative flex items-center gap-3">
                                  <span className="sticker flex size-12 flex-none items-center justify-center rounded-[18px] border-[4px] border-white bg-main">
                                    <Sparkles className="size-6 text-ink" strokeWidth={2.5} aria-hidden="true" />
                                  </span>
                                  <div className="font-pixel text-lg leading-tight font-black">Mint a free Test Chog</div>
                                </div>
                                <p className="relative text-[15px] font-semibold text-ink/75">
                                  Test Chogs are free (gas only, well under a cent) and work exactly like a real Chog. They are
                                  labelled TEST and are not Chog Genesis NFTs. Up to {TEST_CHOG.maxPerWallet} per wallet.
                                </p>
                                <Magnetic className="relative">
                                  <Button size="lg" className={bigButton} onClick={mintTest} disabled={busy}>
                                    {busy ? <Busy>Confirm in wallet...</Busy> : <><Sparkles aria-hidden="true" />Mint a free Test Chog</>}
                                  </Button>
                                </Magnetic>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={body}>
                                We found {chogs?.length} {chogs?.length === 1 ? "Chog" : "Chogs"} in your wallet. Choose the
                                one you are questing with.
                              </p>
                              <div
                                role="radiogroup"
                                aria-label="Your Chogs"
                                className="-mx-2 grid max-h-[420px] grid-cols-2 gap-3.5 overflow-y-auto px-2 pt-3.5 pb-3 sm:grid-cols-3 lg:max-h-[330px]"
                              >
                                {chogs?.map((c, i) => (
                                  <ChogPick
                                    key={c.tokenId}
                                    chog={c}
                                    index={i}
                                    checked={picked === c.tokenId}
                                    onSelect={() => setPicked(c.tokenId)}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                          {!needsMint && (
                            <Magnetic>
                              <Button size="lg" className={bigButton} onClick={choose} disabled={busy}>
                                {busy ? <Busy>Checking...</Busy> : "Continue"}
                              </Button>
                            </Magnetic>
                          )}
                          {!manual && (
                            <button
                              type="button"
                              onClick={() => setManual(true)}
                              className="mx-auto min-h-11 cursor-pointer rounded-full px-4 text-[15px] font-extrabold text-ink/75 underline decoration-2 underline-offset-4 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
                            >
                              Enter a token ID instead
                            </button>
                          )}
                        </div>
                      )}

                      {step === 3 && (
                        <form
                          className="flex flex-col gap-5"
                          onSubmit={(e) => {
                            e.preventDefault()
                            start()
                          }}
                        >
                          <div className="flex flex-col gap-2.5">
                            <h1 id="step-heading" tabIndex={-1} className={heading}>
                              Set your first goal
                            </h1>
                            <p className={body}>One goal is enough to start. Your Chog just picked one too.</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="goal" className="text-[15px] font-black">
                              Your goal
                            </Label>
                            <Input
                              id="goal"
                              required
                              maxLength={120}
                              value={goal}
                              onChange={(e) => setGoal(e.target.value)}
                              placeholder="What do you want to get done?"
                              className={field}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="steps" className="text-[15px] font-black">
                              Check-ins to finish
                            </Label>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                aria-label="Fewer check-ins"
                                aria-controls="steps"
                                disabled={steps <= 1}
                                onClick={() => setSteps(Math.max(1, (Number.isFinite(steps) ? steps : 1) - 1))}
                                className="flex size-13 flex-none cursor-pointer items-center justify-center rounded-[18px] bg-ink/[0.07] transition hover:bg-ink/[0.12] focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Minus className="size-5" strokeWidth={3} aria-hidden="true" />
                              </button>
                              <Input
                                id="steps"
                                type="number"
                                min={1}
                                max={30}
                                required
                                value={steps}
                                onChange={(e) => setSteps(Number(e.target.value))}
                                className={cn(field, "text-center text-xl font-black")}
                              />
                              <button
                                type="button"
                                aria-label="More check-ins"
                                aria-controls="steps"
                                disabled={steps >= 30}
                                onClick={() => setSteps(Math.min(30, (Number.isFinite(steps) ? steps : 0) + 1))}
                                className="flex size-13 flex-none cursor-pointer items-center justify-center rounded-[18px] bg-main transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          {chogQuest && (
                            <motion.div
                              initial={{ opacity: 0, y: 12, rotate: -1 }}
                              animate={{ opacity: 1, y: 0, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.15 }}
                              className="flex items-center gap-3.5 rounded-[24px] bg-[#1E1638] p-3.5 text-white lg:sr-only"
                            >
                              {pickedChog?.image && (
                                // eslint-disable-next-line @next/next/no-img-element -- NFT images come from arbitrary metadata hosts
                                <img
                                  src={pickedChog.image}
                                  alt=""
                                  className="size-14 flex-none rounded-[16px] border-[3px] border-white object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="text-[13px] font-black text-main">Your Chog&apos;s goal</div>
                                <div className="text-[17px] font-extrabold">{chogQuest}</div>
                              </div>
                            </motion.div>
                          )}
                          <div ref={startRef}>
                            <Magnetic>
                              <Button type="submit" size="lg" className={bigButton} disabled={busy}>
                                {busy ? <Busy>Saving...</Busy> : "Start the quest"}
                              </Button>
                            </Magnetic>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        key={error}
                        role="alert"
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: [0, -6, 6, -3, 0] }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 320, damping: 20, x: { duration: 0.35 } }}
                        className="mt-4 rounded-[18px] bg-red/15 px-4 py-3 text-[15px] font-extrabold text-[#8A1E12]"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </MotionRoot>
  )
}
