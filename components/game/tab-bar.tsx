"use client"

import Link from "next/link"
import { Share2, Sun, Swords } from "lucide-react"
import { motion } from "motion/react"
import { usePathname } from "next/navigation"

import { ChogLetter } from "@/components/brand/chog-letter"
import { cn } from "@/lib/utils"

function ChogIcon({ className }: { className?: string }) {
  return <ChogLetter letter="O" color="currentColor" className={cn("translate-y-[-1px]", className)} />
}

const tabs = [
  { href: "/app", label: "Today", icon: Sun },
  { href: "/app/quests", label: "Quests", icon: Swords },
  { href: "/app/chog", label: "Chog", icon: ChogIcon },
  { href: "/app/share", label: "Share", icon: Share2 },
] as const

const pill = { type: "spring", stiffness: 520, damping: 34, mass: 0.8 } as const

export function TabBar() {
  const pathname = usePathname()

  return (
    <div className="sticky bottom-0 z-30 flex-none px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <motion.nav
        aria-label="App"
        initial={{ y: 28, scale: 0.94 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
        className="grid grid-cols-4 gap-1 rounded-full bg-white/85 p-1.5 shadow-[0_18px_40px_-16px_rgb(26_18_0/0.35),0_2px_8px_-2px_rgb(26_18_0/0.08)] ring-1 ring-ink/5 backdrop-blur-xl"
      >
        {tabs.map((tab) => {
          const active = tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[12px] font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-ink",
                active ? "text-ink" : "text-ink/65 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="qc-tab-pill"
                  // Only slide when the tab changes; re-measuring on every render inside the
                  // sticky bar made the pill snap while scrolling.
                  layoutDependency={tab.href}
                  transition={pill}
                  className="absolute inset-0 rounded-full bg-main shadow-[0_8px_18px_-8px_rgb(255_184_0/0.9)]"
                />
              )}
              <motion.span
                className="relative flex"
                animate={active ? { y: -1, scale: 1.12, rotate: [0, -10, 6, 0] } : { y: 0, scale: 1, rotate: 0 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 420, damping: 14, rotate: { duration: 0.45 } }}
              >
                <Icon className="size-[22px]" strokeWidth={2.5} aria-hidden="true" />
              </motion.span>
              <span className="relative">{tab.label}</span>
            </Link>
          )
        })}
      </motion.nav>
    </div>
  )
}
