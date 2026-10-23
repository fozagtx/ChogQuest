"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const tabs = [
  { href: "/app", label: "TODAY" },
  { href: "/app/quests", label: "QUESTS" },
  { href: "/app/chog", label: "CHOG" },
  { href: "/app/share", label: "SHARE" },
] as const

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="App"
      className="sticky bottom-0 flex flex-none gap-1 border-t border-border bg-cream/85 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-1 items-center justify-center rounded-full font-pixel text-xs font-extrabold text-ink-soft transition-colors",
              active ? "bg-main text-ink" : "hover:bg-accent-soft",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
