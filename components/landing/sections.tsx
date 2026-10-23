"use client"

import Link from "next/link"
import { Moon, Sparkles, Target, Wallet } from "lucide-react"
import { motion } from "motion/react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { ChogHair } from "@/components/landing/chog-hair"
import { Logo } from "@/components/landing/nav"
import { buttonVariants } from "@/components/ui/button"
import { CHRONICLE, explorerAddress, explorerTx } from "@/lib/contracts"
import { ITEMS, type Rarity } from "@/lib/items"
import { cn } from "@/lib/utils"

const ease = [0.22, 1, 0.36, 1] as const

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const steps = [
  {
    icon: Wallet,
    back: "bg-ink",
    head: "#1A1200",
    title: "Claim your Chog",
    body: "Connect the wallet that holds it. Your Chog wakes up with a goal of its own.",
  },
  {
    icon: Target,
    back: "bg-violet",
    head: "#8B6CFF",
    title: "Set your goals",
    body: "Pick up to three. They stay private. Your Chog gets its own quest to match.",
  },
  {
    icon: Sparkles,
    back: "bg-green",
    head: "#34C77B",
    title: "Check in. Level up.",
    body: "Log what you did. Your Chog's quest moves too. You both level up.",
  },
  {
    icon: Moon,
    back: "bg-red",
    head: "#FF6B5B",
    title: "Claim the night",
    body: "Every morning there is a diary page and up to three items. Claim them before the next day ends.",
  },
]

/** A Chog head peeking in from the card's right edge, hair fanning up into the empty corner. */
function PeekingHead({ color }: { color: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute top-2 -right-20 size-48"
      variants={{
        rest: { x: 14, rotate: -24, opacity: 0.3 },
        hover: { x: -6, rotate: [-24, -34, -16, -26], opacity: 0.6 },
      }}
      transition={{ type: "spring", stiffness: 220, damping: 14, rotate: { duration: 0.6, ease: "easeInOut" } }}
    >
      <ChogLetter letter="O" color={color} className="size-full" />
    </motion.div>
  )
}

function StepIcon({ icon: Icon, back }: { icon: typeof Moon; back: string }) {
  return (
    <div className="relative h-28 w-36" aria-hidden="true">
      <div className={cn("sticker absolute top-5 left-3 size-20 -rotate-12 rounded-[26px] border-[5px] border-white", back)} />
      <motion.div
        className="sticker absolute top-0 left-12 flex size-24 items-center justify-center rounded-[30px] border-[5px] border-white bg-main"
        variants={{ rest: { y: 0, rotate: 6 }, hover: { y: -8, rotate: -2, scale: 1.06 } }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Icon className="size-11 text-ink" strokeWidth={2.5} />
      </motion.div>
    </div>
  )
}

export function HowYouPlay() {
  return (
    <section id="how" className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 pt-6 pb-10 sm:px-6">
      <Reveal className="mb-8 px-2 text-center">
        <h2 className="font-pixel text-4xl font-black tracking-tight sm:text-5xl">You claim it. You become one.</h2>
        <p className="mt-3 text-xl font-bold text-ink/50">You level up as it levels up.</p>
      </Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <motion.div
              initial="rest"
              whileHover="hover"
              animate="rest"
              className="relative flex h-full min-h-[300px] flex-col gap-4 overflow-hidden rounded-[40px] bg-accent-soft p-8 transition-colors duration-200 hover:bg-accent-softer"
            >
              <PeekingHead color={s.head} />
              <StepIcon icon={s.icon} back={s.back} />
              <div className="relative mt-auto flex flex-col gap-2">
                <span className="text-sm font-black text-ink/35">0{i + 1}</span>
                <h3 className="text-xl font-extrabold">{s.title}</h3>
                <p className="text-[17px] font-semibold text-ink/55">{s.body}</p>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const rarityStyle: Record<Rarity, string> = {
  COMMON: "bg-white text-ink",
  RARE: "bg-violet text-white",
  EPIC: "bg-main text-ink",
}

export function TheNight() {
  const counts = (["COMMON", "RARE", "EPIC"] as const).map((r) => ({
    rarity: r,
    count: ITEMS.filter((i) => i.rarity === r).length,
  }))

  return (
    <section id="night" className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 py-10 sm:px-6">
      <div className="relative grid items-center gap-10 overflow-hidden rounded-[48px] bg-[#1E1638] p-8 pb-44 text-white sm:p-12 sm:pb-56 lg:grid-cols-2 lg:p-16 lg:pb-64">
        <ChogHair className="absolute inset-x-0 bottom-0 h-[150px] w-full sm:h-[200px] lg:h-[230px]" />
        <Reveal className="flex flex-col gap-5">
          <span className="self-start rounded-full bg-white/10 px-4 py-1.5 text-sm font-extrabold text-main">
            While you sleep
          </span>
          <h2 className="font-pixel text-4xl font-black tracking-tight sm:text-5xl">
            Your Chog is up to something.
          </h2>
          <p className="text-lg font-semibold text-white/65">
            Every night it sneaks out and comes home with a diary page and up to three souvenirs. Claim them in one tap,
            gas free, before the end of the next day. Miss it and they slip into Lost and Found.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {counts.map((c) => (
              <span key={c.rarity} className={cn("rounded-full px-4 py-2 text-sm font-black", rarityStyle[c.rarity])}>
                {c.count} {c.rarity.toLowerCase()}
              </span>
            ))}
          </div>
          <p className="text-sm font-bold text-white/60">About 1 night in 12 brings back something epic.</p>
        </Reveal>

        <div className="relative mx-auto h-[360px] w-full max-w-[460px]" aria-hidden="true">
          {[
            { src: "/chogs/chognice.jpg", cls: "left-0 top-6 h-56 w-64 -rotate-6", d: 0 },
            { src: "/chogs/chog6.jpg", cls: "right-0 top-0 h-48 w-56 rotate-6", d: 0.1 },
            { src: "/chogs/chogwow.jpg", cls: "left-1/2 bottom-0 h-52 w-44 -translate-x-1/2 rotate-2", d: 0.2 },
          ].map((p) => (
            <motion.div
              key={p.src}
              className={cn("absolute overflow-hidden rounded-[28px] border-[6px] border-white shadow-2xl", p.cls)}
              initial={{ opacity: 0, scale: 0.7, y: 40 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 140, damping: 16, delay: p.d }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- official Chog art */}
              <img src={p.src} alt="" className="size-full object-cover" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 text-center sm:px-6">
      <Reveal className="flex flex-col items-center gap-6">
        <h2 className="max-w-3xl font-pixel text-4xl font-black tracking-tight sm:text-6xl">
          You complete yours. It completes its. You all win.
        </h2>
        <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "min-h-14 px-9 text-lg")}>
          Connect wallet
        </Link>
      </Reveal>
    </section>
  )
}

export function Footer() {
  const cols = [
    {
      title: "Play",
      links: [
        { label: "Connect wallet", href: "/start" },
        { label: "Today", href: "/app" },
        { label: "Share studio", href: "/app/share" },
      ],
    },
    {
      title: "Chronicle",
      links: [
        { label: "Contract", href: explorerAddress(CHRONICLE.address) },
        { label: "Deploy transaction", href: explorerTx(CHRONICLE.deployTx) },
        { label: "Monad testnet", href: "https://testnet.monad.xyz" },
      ],
    },
    {
      title: "Chog",
      links: [
        { label: "Chogathon", href: "https://chogathon.chog.xyz" },
        { label: "chog.xyz", href: "https://chog.xyz" },
        { label: "Discord", href: "https://discord.gg/chog" },
      ],
    },
  ]

  return (
    <footer id="chronicle" className="relative mt-8 scroll-mt-24 px-6 py-10 lg:px-[120px]">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-5">
          <Logo size="lg" />
          <p className="max-w-xs text-[15px] font-semibold text-ink/60">
            Goals stay private. XP, level, streak and items are recorded on Monad against your Chog&apos;s token ID.
          </p>
          <p className="text-[15px] font-semibold text-ink/60">Made for Chogathon 2026.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="flex flex-col gap-4">
            <p className="text-[17px] font-extrabold text-ink/80">{c.title}</p>
            {c.links.map((l) => {
              const external = l.href.startsWith("http")
              return (
                <a
                  key={l.label}
                  href={l.href}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="text-[17px] font-bold text-ink/60 transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              )
            })}
          </div>
        ))}
      </div>
    </footer>
  )
}
