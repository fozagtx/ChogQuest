export type Rarity = "COMMON" | "RARE" | "EPIC"

export type ItemDef = { id: number; name: string; rarity: Rarity }

// Item ids are what Chronicle stores on-chain. Never renumber; only append.
export const ITEMS: ItemDef[] = [
  { id: 1, name: "Brass button", rarity: "COMMON" },
  { id: 2, name: "Half a biscuit", rarity: "COMMON" },
  { id: 3, name: "Pigeon feather", rarity: "COMMON" },
  { id: 4, name: "Bottle cap", rarity: "COMMON" },
  { id: 5, name: "Moth wing", rarity: "COMMON" },
  { id: 6, name: "Lost sock", rarity: "COMMON" },
  { id: 7, name: "Shiny pebble", rarity: "COMMON" },
  { id: 8, name: "Bus ticket", rarity: "COMMON" },
  { id: 9, name: "Acorn cap", rarity: "COMMON" },
  { id: 10, name: "Paper crane", rarity: "COMMON" },
  { id: 11, name: "Rubber duck", rarity: "COMMON" },
  { id: 12, name: "Snail shell", rarity: "COMMON" },
  { id: 13, name: "Torn map corner", rarity: "RARE" },
  { id: 14, name: "Odd scarf", rarity: "RARE" },
  { id: 15, name: "Night key", rarity: "RARE" },
  { id: 16, name: "Glass marble", rarity: "RARE" },
  { id: 17, name: "Owl's receipt", rarity: "RARE" },
  { id: 18, name: "Tiny lantern", rarity: "RARE" },
  { id: 19, name: "Golden crumb", rarity: "EPIC" },
  { id: 20, name: "Moon ticket", rarity: "EPIC" },
  { id: 21, name: "Crown of the cupboard", rarity: "EPIC" },
]

export const itemById = new Map(ITEMS.map((i) => [i.id, i]))

export const RARITY_RANK: Record<Rarity, number> = { COMMON: 0, RARE: 1, EPIC: 2 }

export function itemsOf(rarity: Rarity) {
  return ITEMS.filter((i) => i.rarity === rarity)
}
