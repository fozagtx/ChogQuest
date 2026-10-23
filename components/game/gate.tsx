"use client"

import Link from "next/link"
import { CloudOff, RotateCw, Sparkles, Wallet } from "lucide-react"
import { motion } from "motion/react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { useAppState } from "@/components/game/app-state"
import { buttonVariants } from "@/components/ui/button"
import type { AppState } from "@/lib/state-types"
import { cn } from "@/lib/utils"

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }

/** Renders children only when signed in with a Chog picked; otherwise a clear next step. */
export function Gate({ children }: { children: (state: Ready) => React.ReactNode }) {
  const { state, status, error, refresh } = useAppState()

  if (status === "loading") return <GateLoader />
  if (status === "error") {
    return (
      <StateCard
        icon={CloudOff}
        fill="bg-red"
        title="Could not load"
        body={error ?? "Something went wrong. Try again."}
      >
        <button type="button" onClick={refresh} className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 rounded-full")}>
          <RotateCw className="size-4" strokeWidth={3} aria-hidden="true" />
          Try again
        </button>
      </StateCard>
    )
  }
  if (status === "signed-out" || !state) {
    return (
      <StateCard
        icon={Wallet}
        photo="/chogs/chogwow.jpg"
        title="Connect your wallet"
        body="Sign in with the wallet that holds your Chog. Your goals stay private."
      >
        <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}>
          Claim your Chog
        </Link>
      </StateCard>
    )
  }
  if (!state.chog) {
    return (
      <StateCard
        icon={Sparkles}
        fill="bg-violet"
        photo="/chogs/chognice.jpg"
        title="Pick your Chog"
        body="Choose the Chog you are questing with."
      >
        <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}>
          Pick your Chog
        </Link>
      </StateCard>
    )
  }
  return <>{children(state as Ready)}</>
}

/** A gentle Chog-head loader over skeleton cards shaped like the screen to come. */
function GateLoader() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 pt-6 pb-2">
        <div className="relative size-20">
          <motion.div
            className="size-full"
            animate={{ y: [0, -10, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChogLetter letter="O" className="size-full" />
          </motion.div>
          <motion.div
            className="absolute -bottom-2 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-ink/10"
            animate={{ scaleX: [1, 0.7, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-[15px] font-extrabold text-ink/65">Waking your Chog</p>
      </div>
      <div aria-hidden="true" className="qc-skeleton h-44 rounded-[32px]" />
      <div aria-hidden="true" className="qc-skeleton h-16 rounded-[24px]" />
      <div aria-hidden="true" className="qc-skeleton h-16 rounded-[24px]" />
    </div>
  )
}

function StateCard({
  icon: Icon,
  fill = "bg-main",
  photo,
  title,
  body,
  children,
}: {
  icon: typeof Wallet
  fill?: string
  photo?: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="relative mt-6 flex flex-col items-center gap-3 overflow-hidden rounded-[36px] bg-white/85 px-6 pt-8 pb-6 text-center shadow-shadow ring-1 ring-ink/5 backdrop-blur-md"
    >
      <ChogLetter
        letter="O"
        color="#8B6CFF"
        className="pointer-events-none absolute -top-6 -right-14 size-40 -rotate-[24deg] opacity-[0.12]"
      />
      <div className="relative mb-2 h-28 w-40" aria-hidden="true">
        {photo && (
          <motion.div
            className="absolute top-1 left-0 size-24 overflow-hidden rounded-[24px] border-[5px] border-white shadow-shadow"
            initial={{ rotate: -30, scale: 0.4, x: 30 }}
            animate={{ rotate: -10, scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art, decorative */}
            <img src={photo} alt="" className="size-full object-cover" />
          </motion.div>
        )}
        <motion.div
          className={cn(
            "sticker absolute flex size-20 items-center justify-center rounded-[26px] border-[5px] border-white",
            fill,
            photo ? "top-6 right-0" : "top-3 left-1/2 -ml-10",
          )}
          initial={{ rotate: 30, scale: 0.3 }}
          animate={{ rotate: 8, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.18 }}
        >
          <Icon className="size-9 text-ink" strokeWidth={2.5} />
        </motion.div>
      </div>
      <h1 className="relative text-[26px] leading-tight font-black tracking-tight">{title}</h1>
      <p className="relative max-w-[30ch] text-[16px] font-semibold text-ink/65">{body}</p>
      {children && <div className="relative mt-2 w-full">{children}</div>}
    </motion.section>
  )
}

export function Notice({
  title,
  body,
  icon: Icon,
  children,
}: {
  title: string
  body: string
  /** optional lucide icon shown as a small sticker */
  icon?: typeof Wallet
  children?: React.ReactNode
}) {
  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-[28px] bg-white/85 p-5 shadow-shadow ring-1 ring-ink/5 backdrop-blur-md">
      <ChogLetter
        letter="O"
        color="#8B6CFF"
        className="pointer-events-none absolute -top-4 -right-10 size-28 -rotate-[24deg] opacity-[0.1]"
      />
      <div className="relative flex items-center gap-2.5">
        {Icon && (
          <span className="flex size-9 flex-none -rotate-6 items-center justify-center rounded-[12px] bg-main">
            <Icon className="size-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
          </span>
        )}
        <div className="text-[17px] font-black tracking-tight">{title}</div>
      </div>
      <p className="relative text-[15px] font-semibold text-ink/65">{body}</p>
      {children && <div className="relative mt-1">{children}</div>}
    </div>
  )
}
