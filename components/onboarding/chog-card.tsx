"use client"

import { Check } from "lucide-react"
import { motion } from "motion/react"

import { NftImage } from "@/components/game/nft-image"
import { chogLabel, isTestChog } from "@/lib/config"
import { cn } from "@/lib/utils"

export type ChogMeta = { tokenId: number; name: string; image: string | null }

/** TEST pill on deep violet: white text holds AA contrast here, unlike on #8B6CFF. */
export function TestBadge({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-[#4B2A9E] px-2.5 py-1 font-pixel text-[11px] leading-none font-black text-white", className)}>
      TEST
    </span>
  )
}

// A slight, stable tilt per token so a grid reads like stickers on a page.
const tilt = (tokenId: number) => [-3, 2.5, -1.5, 3, -2.5, 1.5][tokenId % 6]

/** A Chog from the wallet as a collectible sticker. Behaves as a radio inside a radiogroup. */
export function ChogPick({
  chog,
  checked,
  onSelect,
  index,
}: {
  chog: ChogMeta
  checked: boolean
  onSelect: () => void
  index: number
}) {
  const r = tilt(chog.tokenId)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: index * 0.06 }}
    >
    <motion.button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      initial={false}
      animate={{ scale: checked ? 1.03 : 1, y: checked ? -4 : 0, rotate: checked ? 0 : r }}
      whileHover={{ y: -6, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "sticker relative flex w-full cursor-pointer flex-col gap-2 rounded-[26px] border-[5px] border-white bg-white p-0 text-left outline-none",
        "focus-visible:ring-4 focus-visible:ring-ink focus-visible:ring-offset-2",
        checked && "bg-main ring-4 ring-main",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[20px]">
        <NftImage src={chog.image} alt={chog.name} className="size-full rounded-none border-0 text-[10px]" />
        {isTestChog(chog.tokenId) && <TestBadge className="absolute top-2 left-2" />}
      </div>
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        <span className="font-pixel text-[15px] leading-tight font-black">{chogLabel(chog.tokenId)}</span>
        <span className="truncate text-[13px] font-bold text-ink/70">{chog.name}</span>
      </div>
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: checked ? 1 : 0, rotate: checked ? 0 : -90 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full border-[3px] border-white bg-ink text-main shadow-shadow"
      >
        <Check className="size-5" strokeWidth={3.5} />
      </motion.span>
    </motion.button>
    </motion.div>
  )
}

/** Large showcase version used on the stage. */
export function ChogShowcase({ tokenId, name, image }: { tokenId: number; name?: string; image?: string | null }) {
  return (
    <div className="sticker w-[300px] rounded-[34px] border-[7px] border-white bg-white xl:w-[340px]">
      <div className="relative aspect-square overflow-hidden rounded-[27px]">
        <NftImage src={image} alt={name ?? chogLabel(tokenId)} className="size-full rounded-none border-0" />
        {isTestChog(tokenId) && <TestBadge className="absolute top-3 left-3 px-3 py-1.5 text-xs" />}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <div className="font-pixel text-xl leading-tight font-black">{chogLabel(tokenId)}</div>
          {name && <div className="truncate text-sm font-bold text-ink/70">{name}</div>}
        </div>
      </div>
    </div>
  )
}
