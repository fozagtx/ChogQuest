"use client"

import { Flag, Gem, Lock, Sparkles, Target } from "lucide-react"
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react"

import { ChogLetter } from "@/components/brand/chog-letter"
import { ChogShowcase, type ChogMeta } from "@/components/onboarding/chog-card"
import { Floating, IconSticker, PhotoSticker, TextSticker, springy } from "@/components/onboarding/stickers"
import { chogLabel } from "@/lib/config"
import { cn } from "@/lib/utils"

type Pointer = { mx: MotionValue<number>; my: MotionValue<number> }

/** Official Chog art fanned out like stickers on a fridge door. */
function PhotoFan({ mx, my, compact }: Pointer & { compact?: boolean }) {
  return (
    <div className={cn("relative mx-auto w-full", compact ? "h-[210px] max-w-[340px]" : "h-[560px] max-w-[560px]")}>
      <Floating x="24%" y="44%" depth={22} rotate={-11} delay={0.12} bob={3.9} from={{ x: 80, y: 40 }} mx={mx} my={my}>
        <PhotoSticker src="/chogs/chog1.jpg" className={compact ? "h-28 w-24" : "h-60 w-52"} caption={compact ? undefined : "quest mode"} />
      </Floating>
      <Floating x="77%" y="40%" depth={30} rotate={9} delay={0.2} bob={4.3} from={{ x: -80, y: 40 }} mx={mx} my={my}>
        <PhotoSticker src="/chogs/chogwow.jpg" className={compact ? "h-28 w-24" : "h-56 w-48"} />
      </Floating>
      <Floating x="50%" y="55%" depth={14} rotate={-3} delay={0.05} bob={4.6} mx={mx} my={my} className="z-10">
        <PhotoSticker src="/chogs/chogbadge.jpg" className={compact ? "size-36" : "size-72"} caption={compact ? undefined : "night shift"} />
      </Floating>
      <Floating x={compact ? "24%" : "14%"} y={compact ? "86%" : "84%"} depth={34} rotate={-12} delay={0.32} bob={3.4} mx={mx} my={my} className="z-20">
        <TextSticker className={cn("bg-main text-ink", compact && "text-sm")}>YOU ALL WIN</TextSticker>
      </Floating>
      <Floating x={compact ? "86%" : "84%"} y={compact ? "84%" : "86%"} depth={26} rotate={10} delay={0.38} bob={3.7} mx={mx} my={my} className="z-20">
        <IconSticker icon={Lock} fill="bg-violet" className={compact ? "size-12" : "size-18"} />
      </Floating>
      {!compact && (
        <Floating x="56%" y="10%" depth={18} rotate={6} delay={0.44} bob={4.1} mx={mx} my={my}>
          <TextSticker className="bg-ink text-main">LV UP</TextSticker>
        </Floating>
      )}
    </div>
  )
}

/** The chosen Chog, big, with a tilt that follows the pointer. */
function Showcase({ chog, tokenId, mx, my }: Pointer & { chog: ChogMeta | null; tokenId: number }) {
  const rx = useTransform(my, (v) => v * -10)
  const ry = useTransform(mx, (v) => v * 12)
  return (
    <div className="relative mx-auto flex h-[560px] w-full max-w-[560px] items-center justify-center">
      {/* Chog heads peeking out from behind the card. */}
      <motion.div
        aria-hidden="true"
        className="absolute top-[6%] left-[8%] size-40 opacity-40"
        initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
        animate={{ opacity: 0.4, rotate: -18, scale: 1 }}
        transition={{ ...springy, delay: 0.2 }}
      >
        <ChogLetter letter="O" color="#8B6CFF" className="size-full" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="absolute right-[6%] bottom-[8%] size-32 opacity-40"
        initial={{ opacity: 0, rotate: 40, scale: 0.6 }}
        animate={{ opacity: 0.45, rotate: 16, scale: 1 }}
        transition={{ ...springy, delay: 0.28 }}
      >
        <ChogLetter letter="O" color="#FFB800" className="size-full" />
      </motion.div>

      <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -14, y: 40 }}
          animate={{ opacity: 1, scale: 1, rotate: -4, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 15 }}
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}>
            <ChogShowcase tokenId={tokenId} name={chog?.name} image={chog?.image ?? null} />
          </motion.div>
        </motion.div>
      </motion.div>

      <Floating x="82%" y="18%" depth={28} rotate={10} delay={0.3} bob={3.6} mx={mx} my={my}>
        <IconSticker icon={Gem} fill="bg-violet" className="size-18" />
      </Floating>
      <Floating x="14%" y="78%" depth={22} rotate={-10} delay={0.38} bob={4.0} mx={mx} my={my}>
        <IconSticker icon={Sparkles} fill="bg-main" className="size-16" />
      </Floating>
    </div>
  )
}

/** Your goal and your Chog's goal side by side, filled from the form as you type. */
function QuestPair({
  chog,
  tokenId,
  goal,
  chogQuest,
  mx,
  my,
}: Pointer & { chog: ChogMeta | null; tokenId: number | null; goal: string; chogQuest: string | null }) {
  const trimmed = goal.trim()
  return (
    <div className="relative mx-auto flex h-[560px] w-full max-w-[540px] flex-col items-center justify-center gap-5">
      {tokenId !== null && (
        <Floating x="50%" y="22%" depth={16} rotate={-4} delay={0.05} bob={4.4} mx={mx} my={my}>
          <div className="sticker size-40 overflow-hidden rounded-[30px] border-[6px] border-white bg-white">
            {chog?.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- NFT images come from arbitrary metadata hosts
              <img src={chog.image} alt="" className="size-full object-cover" />
            ) : (
              <div className="nft-stripes flex size-full items-center justify-center p-2 text-center font-pixel text-sm font-black">
                {chogLabel(tokenId)}
              </div>
            )}
          </div>
        </Floating>
      )}
      <div className="mt-[220px] flex w-full flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, x: -40, rotate: -4 }}
          animate={{ opacity: 1, x: 0, rotate: -2 }}
          transition={{ ...springy, delay: 0.15 }}
          className="sticker flex items-center gap-4 rounded-[30px] border-[5px] border-white bg-white px-5 py-4"
        >
          <span className="flex size-12 flex-none items-center justify-center rounded-[18px] bg-main">
            <Target className="size-6 text-ink" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-ink/70">Your goal</div>
            <div className={cn("truncate text-lg font-extrabold", !trimmed && "text-ink/60")}>
              {trimmed || "Shows up here as you type"}
            </div>
          </div>
        </motion.div>
        {chogQuest && (
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 4 }}
            animate={{ opacity: 1, x: 0, rotate: 2 }}
            transition={{ ...springy, delay: 0.25 }}
            className="sticker ml-10 flex items-center gap-4 rounded-[30px] border-[5px] border-white bg-[#1E1638] px-5 py-4 text-white"
          >
            <span className="flex size-12 flex-none items-center justify-center rounded-[18px] bg-violet">
              <Flag className="size-6 text-ink" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-black text-main">Your Chog&apos;s goal</div>
              <div className="truncate text-lg font-extrabold">{chogQuest}</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export function Stage({
  step,
  chog,
  tokenId,
  goal,
  chogQuest,
  mx,
  my,
}: Pointer & {
  step: number
  chog: ChogMeta | null
  tokenId: number | null
  goal: string
  chogQuest: string | null
}) {
  const view = step === 3 ? "quest" : step === 2 && tokenId !== null ? `chog-${tokenId}` : "fan"

  return (
    <>
      {/* Phones: only the opening step gets the sticker fan, the rest keeps the form above the fold. */}
      {step === 1 && (
        <div aria-hidden="true" className="lg:hidden">
          <PhotoFan mx={mx} my={my} compact />
        </div>
      )}
      <div aria-hidden="true" className="relative hidden lg:block">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
          >
            {view === "fan" && <PhotoFan mx={mx} my={my} />}
            {view.startsWith("chog-") && tokenId !== null && <Showcase chog={chog} tokenId={tokenId} mx={mx} my={my} />}
            {view === "quest" && (
              <QuestPair chog={chog} tokenId={tokenId} goal={goal} chogQuest={chogQuest} mx={mx} my={my} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
