"use client"

import Link from "next/link"

import { useAppState } from "@/components/game/app-state"
import { buttonVariants } from "@/components/ui/button"
import type { AppState } from "@/lib/state-types"
import { cn } from "@/lib/utils"

type Ready = AppState & { chog: NonNullable<AppState["chog"]> }

/** Renders children only when signed in with a Chog picked; otherwise a clear next step. */
export function Gate({ children }: { children: (state: Ready) => React.ReactNode }) {
  const { state, status, error, refresh } = useAppState()

  if (status === "loading") {
    return <p className="py-10 text-center font-pixel text-sm font-bold">LOADING...</p>
  }
  if (status === "error") {
    return (
      <Notice title="COULD NOT LOAD" body={error ?? "Try again."}>
        <button type="button" onClick={refresh} className={cn(buttonVariants(), "w-full")}>
          TRY AGAIN
        </button>
      </Notice>
    )
  }
  if (status === "signed-out" || !state) {
    return (
      <Notice title="CONNECT YOUR WALLET" body="Sign in with the wallet that holds your Chog.">
        <Link href="/start" className={cn(buttonVariants(), "w-full")}>
          CLAIM YOUR CHOG
        </Link>
      </Notice>
    )
  }
  if (!state.chog) {
    return (
      <Notice title="PICK YOUR CHOG" body="Choose the Chog you are questing with.">
        <Link href="/start" className={cn(buttonVariants(), "w-full")}>
          PICK YOUR CHOG
        </Link>
      </Notice>
    )
  }
  return <>{children(state as Ready)}</>
}

export function Notice({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow">
      <div className="font-pixel text-sm font-bold">{title}</div>
      <p className="text-[15px]">{body}</p>
      {children}
    </div>
  )
}
