"use client"

import { motion, useTransform, type MotionValue } from "motion/react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export const springy = { type: "spring", stiffness: 140, damping: 16, mass: 0.9 } as const

/** Official Chog art with the white die-cut sticker border. Decorative. */
export function PhotoSticker({ src, className, caption }: { src: string; className?: string; caption?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[26px] border-[5px] border-white shadow-shadow", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art, decorative sticker */}
      <img src={src} alt="" draggable={false} className="size-full object-cover select-none" />
      {caption && (
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-md">
          {caption}
        </span>
      )}
    </div>
  )
}

export function IconSticker({ icon: Icon, fill = "bg-main", className }: { icon: LucideIcon; fill?: string; className?: string }) {
  return (
    <div className={cn("sticker flex items-center justify-center rounded-[24px] border-[5px] border-white", fill, className ?? "size-16")}>
      <Icon className="size-1/2 text-ink" strokeWidth={2.5} aria-hidden="true" />
    </div>
  )
}

export function TextSticker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticker rounded-full border-[5px] border-white px-4 py-1.5 text-center font-pixel text-base leading-none font-black whitespace-nowrap",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Positions a sticker, springs it in, bobs it gently and drifts it with the pointer.
 * The bob is a transform, so MotionConfig reducedMotion="user" skips it.
 */
export function Floating({
  x,
  y,
  depth,
  rotate,
  delay,
  bob,
  from = { x: 0, y: 40 },
  mx,
  my,
  className,
  children,
}: {
  x: string
  y: string
  depth: number
  rotate: number
  delay: number
  bob: number
  from?: { x: number; y: number }
  mx: MotionValue<number>
  my: MotionValue<number>
  className?: string
  children: React.ReactNode
}) {
  const px = useTransform(mx, (v) => v * depth)
  const py = useTransform(my, (v) => v * depth)

  return (
    <div className={cn("absolute", className)} style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.2, x: from.x, y: from.y }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ ...springy, delay }}
      >
        <motion.div style={{ x: px, y: py }}>
          <motion.div
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: bob, repeat: Infinity, ease: "easeInOut", delay: delay * 3 }}
          >
            <motion.div
              style={{ rotate }}
              whileHover={{ scale: 1.08, rotate: rotate + (rotate > 0 ? 4 : -4) }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
