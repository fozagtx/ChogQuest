import { createHmac } from "node:crypto"

import { ITEMS, RARITY_RANK, itemsOf, type ItemDef, type Rarity } from "@/lib/items"

// Night generation is a pure function of (tokenId, day, secret). The AI only
// writes the title and diary text from this output.

export const EPIC_ODDS = 12 // about 1 in 12 nights carries an EPIC item
const RARE_CHANCE = 0.25 // per item, when not EPIC

export type NightRoll = {
  seedHash: string
  items: ItemDef[]
  rarityMax: Rarity
  isRareNight: boolean
}

function stream(seed: Buffer) {
  let counter = 0
  let pool = Buffer.alloc(0)
  return () => {
    if (pool.length < 4) {
      pool = createHmac("sha256", seed).update(String(counter++)).digest()
    }
    const n = pool.readUInt32BE(0)
    pool = pool.subarray(4)
    return n / 0x1_0000_0000
  }
}

function pick<T>(list: T[], r: number): T {
  return list[Math.floor(r * list.length)]
}

export function rollNight(tokenId: number, day: string, secret: string): NightRoll {
  const seed = createHmac("sha256", secret).update(`${tokenId}:${day}`).digest()
  const rand = stream(seed)

  const count = 1 + Math.floor(rand() * 3)
  const isRareNight = rand() < 1 / EPIC_ODDS
  const items: ItemDef[] = []

  for (let i = 0; i < count; i++) {
    let rarity: Rarity = rand() < RARE_CHANCE ? "RARE" : "COMMON"
    if (isRareNight && i === 0) rarity = "EPIC"
    const pool = itemsOf(rarity).filter((it) => !items.some((x) => x.id === it.id))
    items.push(pick(pool.length ? pool : ITEMS, rand()))
  }

  const rarityMax = items.reduce<Rarity>(
    (max, it) => (RARITY_RANK[it.rarity] > RARITY_RANK[max] ? it.rarity : max),
    "COMMON",
  )

  return { seedHash: seed.toString("hex").slice(0, 16), items, rarityMax, isRareNight }
}
