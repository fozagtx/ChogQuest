import "server-only"

import { rollNightOnChain } from "@/lib/chain"
import { dayNumber } from "@/lib/days"
import { RARITY_RANK, itemById, type ItemDef, type Rarity } from "@/lib/items"

// The night's items come from Chronicle's public, deterministic roll, so the diary
// shows exactly what a claim will record on-chain. The AI only writes the words.

export type NightRoll = {
  seedHash: string
  items: ItemDef[]
  rarityMax: Rarity
  isRareNight: boolean
}

export async function rollNight(tokenId: number, day: string): Promise<NightRoll> {
  const ids = await rollNightOnChain(tokenId, dayNumber(day))
  const items = ids.map((id) => {
    const item = itemById.get(id)
    if (!item) throw new Error(`Chronicle returned unknown item id ${id}`)
    return item
  })
  const rarityMax = items.reduce<Rarity>(
    (max, it) => (RARITY_RANK[it.rarity] > RARITY_RANK[max] ? it.rarity : max),
    "COMMON",
  )
  return {
    // Fallback narration picks its wording from this; it only needs to vary per night.
    seedHash: (tokenId * 2654435761 + dayNumber(day) * 40503).toString(16).padStart(8, "0").slice(-8),
    items,
    rarityMax,
    isRareNight: rarityMax === "EPIC",
  }
}
