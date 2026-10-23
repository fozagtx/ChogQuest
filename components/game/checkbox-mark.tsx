"use client"

import { Check } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Round check mark. With `pop`, flipping to checked plays a springy pop with a
 * ring pulse (never on first render). Reduced motion is handled by the app's
 * MotionConfig, so server and client render the same markup.
 */
export function CheckboxMark({ checked, pop = false }: { checked: boolean; pop?: boolean }) {
  // Marks already checked on mount render static; only a live flip animates.
  const [checkedAtMount] = useState(checked)
  const live = pop && !checkedAtMount

  return (
    <motion.span
      aria-hidden="true"
      data-checkmark=""
      initial={false}
      animate={live && checked ? { scale: [1, 1.38, 0.9, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.3, 0.6, 0.8, 1] }}
      className={cn(
        "relative flex size-8 flex-none items-center justify-center rounded-full border-[2.5px] transition-colors duration-200",
        checked ? "border-[#1F9D5C] bg-[#1F9D5C] text-white" : "border-ink/40 bg-white",
      )}
    >
      {live && checked && (
        <motion.span
          className="absolute inset-[-3px] rounded-full border-[3px] border-[#1F9D5C]"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      {checked && (
        <motion.span
          initial={live ? { scale: 0, rotate: -30 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 14 }}
          className="flex"
        >
          <Check className="size-[18px]" strokeWidth={3.5} />
        </motion.span>
      )}
    </motion.span>
  )
}
