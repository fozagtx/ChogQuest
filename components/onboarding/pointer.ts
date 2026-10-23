"use client"

import { useMotionValue, useReducedMotion, useSpring, type MotionValue } from "motion/react"
import { useEffect } from "react"

/**
 * Window-wide pointer position as springy motion values in the range -0.5..0.5.
 * Mouse only, and inert under prefers-reduced-motion, so touch users and people
 * who ask for less motion get a still page.
 */
export function usePointerParallax(): { mx: MotionValue<number>; my: MotionValue<number> } {
  const reduce = useReducedMotion()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      rawX.set(e.clientX / window.innerWidth - 0.5)
      rawY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [reduce, rawX, rawY])

  return { mx, my }
}
