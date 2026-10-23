"use client"

import Link from "next/link"
import { ChevronDown, Flame, Gem, Moon, Sparkles, Swords, Trophy } from "lucide-react"
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

import { ChogShader } from "@/components/landing/chog-shader"
import { Wordmark } from "@/components/brand/chog-letter"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const spring = { type: "spring", stiffness: 140, damping: 16, mass: 0.9 } as const

type StickerDef = {
  x: number // % of hero width
  y: number // % of hero height
  depth: number // parallax strength
  rotate: number
  delay: number
  bob: number // seconds per bob cycle
  desktopOnly?: boolean
  node: React.ReactNode
}

function ChogPhoto({ src, alt, size, caption }: { src: string; alt: string; size: string; caption?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[26px] border-[5px] border-white shadow-shadow", size)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art, decorative sticker */}
      <img src={src} alt={alt} draggable={false} className="size-full object-cover select-none" />
      {caption && (
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-md">
          {caption}
        </span>
      )}
    </div>
  )
}

function IconSticker({ icon: Icon, fill = "bg-main", size = "size-20" }: { icon: typeof Moon; fill?: string; size?: string }) {
  return (
    <div className={cn("sticker flex items-center justify-center rounded-[28px] border-[5px] border-white", fill, size)}>
      <Icon className="size-1/2 text-ink" strokeWidth={2.5} aria-hidden="true" />
    </div>
  )
}

function TextSticker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticker rounded-full border-[5px] border-white px-5 py-2 text-center font-pixel text-xl leading-none font-black whitespace-nowrap",
        className,
      )}
    >
      {children}
    </div>
  )
}

const stickers: StickerDef[] = [
  { x: 14, y: 22, depth: 18, rotate: -8, delay: 0.05, bob: 3.6, node: <IconSticker icon={Moon} /> },
  { x: 25, y: 30, depth: 28, rotate: 5, delay: 0.1, bob: 4.2, node: <ChogPhoto src="/chogs/chog1.jpg" alt="Chog at the controls" size="h-36 w-32" caption="quest mode" /> },
  { x: 12, y: 47, depth: 22, rotate: -14, delay: 0.15, bob: 3.9, node: <TextSticker className="bg-main text-ink">YOU ALL<br />WIN</TextSticker> },
  { x: 29, y: 60, depth: 34, rotate: 10, delay: 0.2, bob: 3.3, node: <IconSticker icon={Flame} fill="bg-red" size="size-16" /> },
  { x: 10, y: 79, depth: 26, rotate: -4, delay: 0.25, bob: 4.5, node: <ChogPhoto src="/chogs/chog5.jpg" alt="Chog" size="h-40 w-36" caption="night shift" /> },
  { x: 23, y: 90, depth: 16, rotate: -18, delay: 0.3, bob: 3.7, desktopOnly: true, node: <IconSticker icon={Swords} size="size-16" /> },
  { x: 74, y: 21, depth: 20, rotate: 8, delay: 0.08, bob: 4.0, node: <TextSticker className="bg-ink text-main">LV UP</TextSticker> },
  { x: 92, y: 26, depth: 30, rotate: -6, delay: 0.12, bob: 3.5, node: <ChogPhoto src="/chogs/chogwow.jpg" alt="Surprised Chog" size="h-40 w-36" /> },
  { x: 72, y: 42, depth: 24, rotate: -10, delay: 0.18, bob: 4.3, node: <TextSticker className="bg-violet text-white">EPIC</TextSticker> },
  { x: 86, y: 52, depth: 36, rotate: 12, delay: 0.22, bob: 3.4, node: <IconSticker icon={Gem} fill="bg-violet" /> },
  { x: 78, y: 70, depth: 22, rotate: 4, delay: 0.27, bob: 4.1, node: <ChogPhoto src="/chogs/chog6.jpg" alt="Chog on an adventure" size="h-28 w-32" /> },
  { x: 91, y: 82, depth: 18, rotate: -8, delay: 0.32, bob: 3.8, desktopOnly: true, node: <IconSticker icon={Trophy} size="size-16" /> },
  { x: 40, y: 16, depth: 14, rotate: 6, delay: 0.35, bob: 4.4, desktopOnly: true, node: <IconSticker icon={Sparkles} fill="bg-green" size="size-14" /> },
]

function Sticker({ def, mx, my, reduce }: { def: StickerDef; mx: MotionValue<number>; my: MotionValue<number>; reduce: boolean }) {
  const px = useTransform(mx, (v) => v * def.depth)
  const py = useTransform(my, (v) => v * def.depth)

  return (
    <div
      className={cn("absolute z-10 max-md:scale-[0.62]", def.desktopOnly && "hidden lg:block", def.y >= 55 && "max-md:hidden")}
      style={{ left: `${def.x}%`, top: `${def.y}%`, transform: "translate(-50%, -50%)" }}
    >
      {/* Entrance: bursts out from behind the phone. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.1, x: `${(50 - def.x) * 0.9}vw`, y: `${(45 - def.y) * 0.9}vh` }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ ...spring, delay: 0.55 + def.delay }}
      >
        {/* Mouse parallax */}
        <motion.div style={{ x: px, y: py }}>
          {/* Idle bob */}
          <motion.div
            animate={reduce ? undefined : { y: [0, -9, 0] }}
            transition={{ duration: def.bob, repeat: Infinity, ease: "easeInOut", delay: def.delay * 4 }}
          >
            <motion.div
              style={{ rotate: def.rotate }}
              drag
              dragSnapToOrigin
              dragElastic={0.5}
              whileHover={{ scale: 1.08, rotate: def.rotate + (def.rotate > 0 ? 4 : -4) }}
              whileTap={{ scale: 0.94 }}
              whileDrag={{ scale: 1.12, zIndex: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="cursor-grab active:cursor-grabbing"
            >
              {def.node}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function Phone({ mx, my, reduce }: { mx: MotionValue<number>; my: MotionValue<number>; reduce: boolean }) {
  const rx = useTransform(my, (v) => v * -6)
  const ry = useTransform(mx, (v) => v * 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, rotate: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: -6, scale: 1 }}
      transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.1 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className="relative z-0 mt-2 w-[220px] sm:w-[250px] lg:w-[270px]"
      aria-hidden="true"
    >
      <div className="rounded-[52px] bg-gradient-to-b from-white/90 to-white/50 p-3 shadow-[0_40px_80px_-30px_rgb(26_18_0/0.35)] ring-1 ring-ink/5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 rounded-[42px] bg-gradient-to-b from-[#EEF0FF] to-[#FFF6DE] p-4 pb-6">
          <div className="mx-auto h-6 w-24 rounded-full bg-ink/90" />
          <div className="relative overflow-hidden rounded-[28px] shadow-shadow">
            {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art */}
            <img src="/chogs/chogbadge.jpg" alt="" className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-full bg-white/80 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[11px] font-black">Diary page waiting</span>
              <Moon className="size-3.5" strokeWidth={3} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Swords, label: "Quests", fill: "bg-main" },
              { icon: Gem, label: "Items", fill: "bg-violet" },
              { icon: Flame, label: "Streak", fill: "bg-red" },
            ].map(({ icon: Icon, label, fill }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={cn("flex aspect-square w-full items-center justify-center rounded-[18px] shadow-shadow", fill)}>
                  <Icon className="size-6 text-ink" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-extrabold text-ink-soft">{label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[20px] bg-white/80 p-3 shadow-shadow">
            <div className="mb-1.5 flex justify-between text-[11px] font-black">
              <span>Party</span>
              <span className="text-ink-soft">XP</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-accent-soft">
              <motion.div
                className="h-full rounded-full bg-main"
                initial={{ width: "8%" }}
                animate={{ width: reduce ? "62%" : ["8%", "62%", "62%", "8%"] }}
                transition={{ duration: 6, times: [0, 0.35, 0.85, 1], repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

const words = ["Your", "Chog", "has", "a", "goal.", "So", "do", "you."]

export function Hero() {
  const reduce = useReducedMotion() ?? false
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18 })

  return (
    <section
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return
        const r = e.currentTarget.getBoundingClientRect()
        rawX.set((e.clientX - r.left) / r.width - 0.5)
        rawY.set((e.clientY - r.top) / r.height - 0.5)
      }}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-main/30 via-main/10 to-transparent"
      />
      <ChogShader className="pointer-events-none absolute inset-0" />

      {stickers.map((s, i) => (
        <Sticker key={i} def={s} mx={mx} my={my} reduce={reduce} />
      ))}

      {/* Like Locket: the phone is cropped and fades into the page at the bottom. */}
      <div className="relative flex h-[min(56svh,500px)] w-full items-start justify-center [mask-image:linear-gradient(to_bottom,black_62%,transparent_98%)]">
        <Phone mx={mx} my={my} reduce={reduce} />
      </div>

      <div className="relative z-20 -mt-6 flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.35 }}
          className="flex items-center gap-4"
        >
          <h1 className="font-pixel text-5xl font-black tracking-tight sm:text-7xl">
            <Wordmark />
          </h1>
        </motion.div>

        <p className="max-w-2xl text-xl font-bold text-ink/50 sm:text-[26px]">
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.6 + i * 0.05 }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1.05 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "min-h-14 px-8 text-lg")}>
              Connect wallet
            </Link>
            {/* Shown once the bot is deployed and NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is set. */}
            {bot && (
              <a
                href={`https://t.me/${bot}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "neutral", size: "lg" }), "min-h-14 px-8 text-lg")}
              >
                Open in Telegram
              </a>
            )}
          </div>
          <p className="text-sm font-bold text-ink/65">Your goals stay private. Only XP and items go on-chain.</p>
        </motion.div>

        <motion.a
          href="#how"
          aria-label="How you play"
          animate={reduce ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mt-2 flex size-11 items-center justify-center text-ink/45 hover:text-ink/70"
        >
          <ChevronDown className="size-9" strokeWidth={3} />
        </motion.a>
      </div>
    </section>
  )
}
