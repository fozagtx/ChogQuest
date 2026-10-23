"use client"

import Link from "next/link"
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { Wordmark } from "@/components/brand/chog-letter"
import { cn } from "@/lib/utils"

const links = [
  { href: "#how", label: "How you play" },
  { href: "#night", label: "While you sleep" },
  { href: "#chronicle", label: "Chronicle" },
]

// How long scrolling must be still before the nav comes back.
const SETTLE_MS = 220

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Wordmark className={cn("font-pixel font-black tracking-tight", size === "lg" ? "text-4xl" : "text-[28px]")} />
  )
}

export function Nav() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [focused, setFocused] = useState(false)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide while the page is moving, show again once scrolling settles.
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24)
    if (y <= 24) {
      setScrolling(false)
      return
    }
    setScrolling(true)
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => setScrolling(false), SETTLE_MS)
  })

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current)
  }, [])

  // Keyboard users never lose the nav while tabbing through it.
  const hidden = scrolling && !focused

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: hidden ? "-110%" : 0, opacity: hidden && reduce ? 0 : 1 }}
      transition={
        reduce
          ? { duration: 0.15 }
          : hidden
            ? { duration: 0.22, ease: [0.4, 0, 1, 1] }
            : { type: "spring", stiffness: 260, damping: 26 }
      }
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-300",
        scrolled && "bg-cream/75 shadow-[0_1px_0_rgb(26_18_0/0.06)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-[120px]">
        <Link href="/" aria-label="Quest Chog home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-10 md:flex" aria-label="Sections">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[17px] font-bold text-ink/50 transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/start"
          className="inline-flex min-h-11 items-center rounded-full bg-ink/10 px-5 text-[17px] font-extrabold text-ink/80 transition-colors hover:bg-ink/15"
        >
          Connect wallet
        </Link>
      </div>
    </motion.header>
  )
}
