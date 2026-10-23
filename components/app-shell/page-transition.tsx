"use client"

import { motion } from "motion/react"
import { usePathname } from "next/navigation"

/** Each screen springs up into place when you switch tabs. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, opacity: { duration: 0.25 } }}
      className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-6"
    >
      {children}
    </motion.main>
  )
}
