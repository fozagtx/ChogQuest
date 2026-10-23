"use client"

import { Flame, Gem, Moon, Sparkles, Trophy } from "lucide-react"
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react"
import { useEffect } from "react"

import { cn } from "@/lib/utils"

import { useMediaQuery } from "./use-media-query"

/*
 * Wide screens only: the landing's sticker pile floats in the gutters on either
 * side of the app column. Decorative, official Chog art and icons only.
 * Mounted after hydration and only when there is room, so phones never pay for it.
 */

const COLUMN = 440

type Def = {
  side: "l" | "r"
  gx: number // 0..1 across the gutter, measured from the outer edge
  y: number // % of viewport height
  rotate: number
  depth: number
  bob: number
  delay: number
  node: React.ReactNode
}

function Photo({ src, size, caption }: { src: string; size: string; caption?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[26px] border-[5px] border-white shadow-shadow", size)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art, decorative sticker */}
      <img src={src} alt="" draggable={false} className="size-full object-cover select-none" />
      {caption && (
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-md">
          {caption}
        </span>
      )}
    </div>
  )
}

function Icon({ icon: I, fill = "bg-main", size = "size-20" }: { icon: typeof Moon; fill?: string; size?: string }) {
  return (
    <div className={cn("sticker flex items-center justify-center rounded-[28px] border-[5px] border-white", fill, size)}>
      <I className="size-1/2 text-ink" strokeWidth={2.5} />
    </div>
  )
}

function Word({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticker rounded-full border-[5px] border-white px-5 py-2 text-xl leading-none font-black whitespace-nowrap",
        className,
      )}
    >
      {children}
    </div>
  )
}

const defs: Def[] = [
  { side: "l", gx: 0.62, y: 14, rotate: -8, depth: 18, bob: 3.8, delay: 0.05, node: <Icon icon={Moon} /> },
  { side: "l", gx: 0.3, y: 36, rotate: 5, depth: 28, bob: 4.3, delay: 0.12, node: <Photo src="/chogs/chog1.jpg" size="h-40 w-36" caption="quest mode" /> },
  { side: "l", gx: 0.72, y: 58, rotate: -12, depth: 22, bob: 3.5, delay: 0.18, node: <Word className="bg-ink text-main">LV UP</Word> },
  { side: "l", gx: 0.38, y: 80, rotate: -4, depth: 30, bob: 4.6, delay: 0.24, node: <Photo src="/chogs/chog5.jpg" size="h-36 w-32" caption="night shift" /> },
  { side: "l", gx: 0.82, y: 92, rotate: 10, depth: 16, bob: 3.3, delay: 0.3, node: <Icon icon={Flame} fill="bg-red" size="size-16" /> },
  { side: "r", gx: 0.4, y: 18, rotate: 7, depth: 26, bob: 4.1, delay: 0.08, node: <Photo src="/chogs/chogwow.jpg" size="h-40 w-36" /> },
  { side: "r", gx: 0.78, y: 40, rotate: 12, depth: 34, bob: 3.6, delay: 0.15, node: <Icon icon={Gem} fill="bg-violet" /> },
  { side: "r", gx: 0.3, y: 54, rotate: -9, depth: 20, bob: 4.4, delay: 0.2, node: <Word className="bg-violet text-white">EPIC</Word> },
  { side: "r", gx: 0.6, y: 76, rotate: 4, depth: 24, bob: 3.9, delay: 0.26, node: <Photo src="/chogs/chog6.jpg" size="h-32 w-36" /> },
  { side: "r", gx: 0.22, y: 92, rotate: -8, depth: 16, bob: 4.2, delay: 0.32, node: <Icon icon={Trophy} size="size-16" /> },
  { side: "r", gx: 0.88, y: 8, rotate: 6, depth: 12, bob: 4.8, delay: 0.36, node: <Icon icon={Sparkles} fill="bg-green" size="size-14" /> },
]

const spring = { type: "spring", stiffness: 140, damping: 16, mass: 0.9 } as const

function Sticker({ def, mx, my }: { def: Def; mx: MotionValue<number>; my: MotionValue<number> }) {
  const px = useTransform(mx, (v) => v * def.depth)
  const py = useTransform(my, (v) => v * def.depth)
  const gutter = `((100vw - ${COLUMN}px) / 2)`
  const left = def.side === "l" ? `calc(${gutter} * ${def.gx})` : `calc(100vw - ${gutter} * ${def.gx})`

  return (
    <div
      className="absolute lg:scale-[0.72] xl:scale-90 2xl:scale-100"
      style={{ left, top: `${def.y}%`, translate: "-50% -50%" }}
    >
      {/* Entrance: bursts out from behind the app column. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.2, x: def.side === "l" ? 220 : -220 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ ...spring, delay: 0.35 + def.delay }}
      >
        <motion.div style={{ x: px, y: py }}>
          <div className="qc-bob" style={{ "--qc-bob": `${def.bob}s`, animationDelay: `${-def.delay * 8}s` } as React.CSSProperties}>
            <motion.div
              style={{ rotate: def.rotate }}
              drag
              dragSnapToOrigin
              dragElastic={0.5}
              whileHover={{ scale: 1.08, rotate: def.rotate + (def.rotate > 0 ? 4 : -4) }}
              whileTap={{ scale: 0.94 }}
              whileDrag={{ scale: 1.12, zIndex: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
            >
              {def.node}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function Pile() {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      rawX.set(e.clientX / window.innerWidth - 0.5)
      rawY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [rawX, rawY])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {defs.map((d, i) => (
        <Sticker key={i} def={d} mx={mx} my={my} />
      ))}
    </div>
  )
}

export function SideStickers() {
  const wide = useMediaQuery("(min-width: 1100px)")
  return wide ? <Pile /> : null
}
