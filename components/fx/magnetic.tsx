"use client"

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react"
import { useRef, type PointerEvent, type ReactNode } from "react"

const spring = { stiffness: 260, damping: 18, mass: 0.5 }

/**
 * Pulls its child a few pixels toward the pointer and springs back on leave.
 * Fine pointers only; inert under prefers-reduced-motion. Keyboard focus and
 * clicks pass straight through to the child.
 */
export function Magnetic({
  children,
  strength = 6,
  className,
}: {
  children: ReactNode
  /** max offset in px */
  strength?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), spring)
  const y = useSpring(useMotionValue(0), spring)

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    x.set(Math.max(-1, Math.min(1, dx)) * strength)
    y.set(Math.max(-1, Math.min(1, dy)) * strength * 0.6)
  }

  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduced ? undefined : { x, y }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </motion.div>
  )
}
