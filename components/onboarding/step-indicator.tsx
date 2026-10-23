"use client"

import { Check } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const labels = ["Connect", "Your Chog", "First goal"] as const

/** Three springy dots joined by a track that fills as you go. */
export function StepIndicator({ step }: { step: number }) {
  return (
    <ol aria-label="Onboarding progress" className="relative grid grid-cols-3">
      {/* Track behind the dots, from the first dot's centre to the last. */}
      <div aria-hidden="true" className="absolute top-[18px] right-[16.66%] left-[16.66%] h-1.5 rounded-full bg-ink/10">
        <motion.div
          className="h-full rounded-full bg-main"
          initial={false}
          animate={{ width: `${((step - 1) / 2) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      {labels.map((label, i) => {
        const n = i + 1
        const done = n < step
        const current = n === step
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5"
          >
            <motion.span
              initial={false}
              animate={{ scale: current ? 1.12 : 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-[3px] border-white font-pixel text-base font-black shadow-shadow transition-colors duration-300",
                done && "bg-ink text-main",
                current && "bg-main text-ink",
                !done && !current && "bg-white text-ink/70",
              )}
            >
              {done ? <Check className="size-5" strokeWidth={3.5} aria-hidden="true" /> : n}
            </motion.span>
            <span className={cn("text-[13px] font-extrabold", current ? "text-ink" : "text-ink/70")}>
              {label}
              <span className="sr-only">{done ? ", done" : current ? ", current step" : ""}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
