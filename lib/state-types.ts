import type { Rarity } from "@/lib/items"

// Shapes returned by /api/state and consumed by the app screens.

export type QuestView = {
  id: number
  owner: "you" | "chog"
  name: string
  status: "active" | "done" | "dropped"
  stepsDone: number
  stepsTotal: number
  xpReward: number
  checkedInToday: boolean
}

export type NightView = {
  day: string
  number: number
  title: string
  diary: string
  items: { id: number; name: string; rarity: Rarity }[]
  rarityMax: Rarity
  claimed: boolean
  claimable: boolean
  expiresAt: string
  txHash: string | null
}

export type AppState = {
  user: { address: string; telegramLinked: boolean; telegramMuted: boolean }
  chog: null | {
    tokenId: number
    name: string
    image: string | null
    xp: number
    level: number
    levelXp: number
    levelPct: number
    streak: number
    sleepInAvailable: boolean
    nights: number
    items: number
    rare: number
  }
  night: NightView | null
  quests: QuestView[]
  inventory: { id: number; name: string; rarity: Rarity; count: number }[]
  lostAndFound: { nights: number; items: { name: string; rarity: Rarity }[] }
  weeklyXp: { day: string; label: string; xp: number }[]
  lastCompleted: null | {
    name: string
    xpReward: number
    chogQuest: { name: string; done: boolean } | null
  }
  chronicle: { enabled: boolean; address: string }
}
