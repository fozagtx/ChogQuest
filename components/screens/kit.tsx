"use client"

import {
  LayoutGroup,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react"
import { useEffect, useId, useRef } from "react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { cn } from "@/lib/utils"

// Shared motion + layout pieces for the in-app screens. Same language as the
// landing page: springy, sticker-like, cream/yellow/night.

export const spring = { type: "spring", stiffness: 260, damping: 22, mass: 0.8 } as const
export const bouncy = { type: "spring", stiffness: 420, damping: 16 } as const

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
}

/**
 * Screen root. Server and first client render share one starting state; people
 * who ask for reduced motion get transforms skipped at runtime by MotionConfig.
 */
export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className={cn("@container flex flex-col gap-5", className)}
        >
          {children}
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  )
}

/** One step of the entrance choreography. Must sit inside <Screen> or <Stagger>. */
export function Rise({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode
  className?: string
  as?: "div" | "section" | "li"
}) {
  const Tag = as === "section" ? motion.section : as === "li" ? motion.li : motion.div
  return (
    <Tag variants={rise} className={className}>
      {children}
    </Tag>
  )
}

/** A nested staggered group (e.g. a grid) that plays after its parent step. */
export function Stagger({
  children,
  className,
  as = "div",
  gap = 0.05,
}: {
  children: React.ReactNode
  className?: string
  as?: "div" | "ul"
  gap?: number
}) {
  const Tag = as === "ul" ? motion.ul : motion.div
  return (
    <Tag
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: 0.05 } } }}
      className={className}
    >
      {children}
    </Tag>
  )
}

/** Big friendly screen title with a Chog head bobbing beside it. */
export function ScreenHeader({
  title,
  kicker,
  headColor = "#8B6CFF",
  children,
}: {
  title: string
  kicker: string
  headColor?: string
  children?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <Rise className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-end gap-2.5">
        <motion.span
          aria-hidden="true"
          className="mb-1 inline-flex size-11 flex-none"
          animate={reduce ? undefined : { rotate: [-8, 6, -8], y: [0, -3, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChogLetter letter="O" color={headColor} className="size-full" />
        </motion.span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold text-ink/70">{kicker}</p>
          <h1 className="font-pixel text-[32px] leading-none font-black tracking-tight">{title}</h1>
        </div>
      </div>
      {children}
    </Rise>
  )
}

/**
 * A number that counts up once it mounts. Screen readers get the final value
 * straight away; the animated digits are decorative.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const from = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) {
      el.textContent = String(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration: Math.min(1.4, 0.5 + value * 0.04),
      ease: [0.22, 1, 0.36, 1],
      delay: from.current === 0 ? 0.35 : 0,
      onUpdate: (v) => {
        el.textContent = String(Math.round(v))
      },
    })
    from.current = value
    return () => controls.stop()
  }, [value, reduce])

  return (
    <span className={cn("tabular-nums", className)}>
      <span ref={ref} aria-hidden="true">
        0
      </span>
      <span className="sr-only">{value}</span>
    </span>
  )
}

/** Animated progress bar: fills with a spring, glossy top edge. */
export function FillBar({
  value,
  label,
  fill = "bg-main",
  track = "bg-ink/8",
  className,
}: {
  value: number
  label: string
  fill?: string
  track?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("relative h-3.5 w-full overflow-hidden rounded-full", track, className)}
    >
      <motion.div
        className={cn("absolute inset-y-0 left-0 w-full origin-left rounded-full", fill)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.25 }}
      >
        <span className="absolute inset-x-1.5 top-[3px] h-[3px] rounded-full bg-white/45" />
      </motion.div>
    </div>
  )
}

/** Circular XP ring drawn with SVG, sweeping in on mount. */
export function Ring({
  value,
  size = 112,
  stroke = 12,
  color = "#FFB800",
  track = "rgb(26 18 0 / 0.08)",
  label,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  label: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const pct = Math.max(0, Math.min(100, value)) / 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className="relative flex-none"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(pct, 0.001) }}
          transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/**
 * Pointer tilt with a soft glare, like holding a collectible card. Mouse only;
 * inert under reduced motion.
 */
export function Tilt({
  children,
  className,
  max = 10,
}: {
  children: React.ReactNode
  className?: string
  max?: number
}) {
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, { stiffness: 150, damping: 18 })
  const sy = useSpring(py, { stiffness: 150, damping: 18 })
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const glareX = useTransform(sx, [0, 1], ["0%", "100%"])
  const glareY = useTransform(sy, [0, 1], ["0%", "100%"])
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgb(255 255 255 / 0.45), transparent 55%)`,
  )

  return (
    <motion.div
      className={cn("relative", className)}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return
        const r = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - r.left) / r.width)
        py.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => {
        px.set(0.5)
        py.set(0.5)
      }}
    >
      {children}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glare }}
        />
      )}
    </motion.div>
  )
}

/** Gold sweep that slides across an epic sticker every few seconds. */
export function Shimmer({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/70 to-transparent",
        className,
      )}
      animate={{ x: ["0%", "320%"] }}
      transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
    />
  )
}

/** Segmented pill switcher with a springy sliding indicator. */
export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  idPrefix,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: React.ReactNode; count?: number }[]
  label: string
  idPrefix?: string
}) {
  const auto = useId()
  const id = idPrefix ?? auto
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-full gap-1 rounded-full bg-white p-1.5 shadow-shadow"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
        const i = options.findIndex((o) => o.value === value)
        const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length]
        onChange(next.value)
        document.getElementById(`${id}-tab-${next.value}`)?.focus()
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            id={`${id}-tab-${o.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${id}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              active ? "text-ink" : "text-ink/70 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                layoutDependency={o.label}
                className="absolute inset-0 rounded-full bg-main shadow-[0_8px_18px_-8px_rgb(255_184_0/0.8)]"
                transition={bouncy}
              />
            )}
            <span className="relative flex items-center gap-1.5 [&_svg]:size-4">
              {o.icon}
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-[12px] leading-5 tabular-nums",
                    active ? "bg-ink text-main" : "bg-ink/8 text-ink",
                  )}
                >
                  {o.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
