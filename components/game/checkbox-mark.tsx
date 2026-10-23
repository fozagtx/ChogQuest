"use client"

import { Check } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Round check mark. With `pop`, flipping to checked plays a springy pop
 * (never on first render, and not under prefers-reduced-motion).
 */
export function CheckboxMark({ checked, pop = false }: { checked: boolean; pop?: boolean }) {
  const reduced = useReducedMotion()
  // Marks already checked on mount render static; only a live flip animates.
  const [checkedAtMount] = useState(checked)
  const animate = pop && !reduced && checked ? { scale: [1, 1.38, 0.9, 1.06, 1] } : { scale: 1 }

  return (
    <motion.span
      aria-hidden="true"
      data-checkmark=""
      initial={false}
      animate={animate}
      transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.3, 0.6, 0.8, 1] }}
      className={cn(
        "flex size-7 flex-none items-center justify-center rounded-full border-2 border-border",
        checked ? "border-green bg-green text-white" : "bg-secondary-background",
      )}
    >
      {checked && (
        <motion.span
          initial={checkedAtMount || !pop || reduced ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 14 }}
          className="flex"
        >
          <Check className="size-4" strokeWidth={3} />
        </motion.span>
      )}
    </motion.span>
  )
}
