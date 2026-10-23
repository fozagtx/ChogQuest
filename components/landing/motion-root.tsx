"use client"

import { MotionConfig } from "motion/react"

// Server and client always render the same starting state; people who ask for
// reduced motion get transforms skipped at runtime instead.
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
