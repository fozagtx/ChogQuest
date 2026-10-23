"use client"

import Link from "next/link"
import { motion } from "motion/react"

import { LogoMark, Wordmark } from "@/components/brand/chog-letter"
import { useAppState } from "@/components/game/app-state"
import { NftImage } from "@/components/game/nft-image"

/** Top of every app screen: the mark, and the Chog you are questing with once it is known. */
export function AppHeader() {
  const { state } = useAppState()
  const chog = state?.chog ?? null

  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-1">
      <Link
        href="/"
        aria-label="Quest Chog home"
        className="-ml-1 flex min-h-11 items-center gap-2 rounded-full pr-2 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <motion.span
          initial={{ scale: 0.6, rotate: -24 }}
          animate={{ scale: 1, rotate: -6 }}
          whileHover={{ rotate: 6, scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 16 }}
          className="flex"
        >
          <LogoMark className="size-9 rounded-[12px]" />
        </motion.span>
        <Wordmark className="text-[21px] font-black tracking-tight" />
      </Link>

      {chog && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, x: 12 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
        >
          <Link
            href="/app/chog"
            className="flex min-h-11 items-center gap-2 rounded-full bg-white/80 py-1 pr-3.5 pl-1 text-[13px] font-extrabold shadow-shadow ring-1 ring-ink/5 backdrop-blur-md transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink"
          >
            <NftImage src={chog.image} alt="" label="" className="size-9 rounded-full border-2 border-white" />
            <span className="max-w-[130px] truncate">{chog.label}</span>
          </Link>
        </motion.div>
      )}
    </header>
  )
}
