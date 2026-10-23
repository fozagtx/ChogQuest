import { addDays, weekKey } from "@/lib/days"

// Deterministic game numbers. AI never touches these.

export const LEVEL_XP = 500
export const CHECKIN_XP = 60
export const CLAIM_XP = 40
export const MAX_GOALS = 3

export function levelFor(xp: number) {
  return 1 + Math.floor(xp / LEVEL_XP)
}

export function levelProgress(xp: number) {
  const into = xp % LEVEL_XP
  return { level: levelFor(xp), into, pct: Math.round((into / LEVEL_XP) * 100) }
}

/** Quest reward scales with steps so longer quests pay more. */
export function questReward(stepsTotal: number) {
  return 60 * Math.max(1, Math.min(stepsTotal, 30))
}

/**
 * Streak = consecutive days (ending today, or yesterday if today has no activity yet)
 * with at least one check-in or claim. One missed day per week is covered by a
 * free sleep-in.
 */
export function computeStreak(activeDays: Iterable<string>, today: string) {
  const days = new Set(activeDays)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  const freezesUsed = new Set<string>()

  for (let guard = 0; guard < 3650; guard++) {
    if (days.has(cursor)) {
      streak++
    } else {
      const week = weekKey(cursor)
      // A sleep-in only bridges a gap; it cannot start or end a streak.
      if (freezesUsed.has(week) || streak === 0 || !days.has(addDays(cursor, -1))) break
      freezesUsed.add(week)
    }
    cursor = addDays(cursor, -1)
  }

  const thisWeek = weekKey(today)
  return { streak, sleepInAvailable: !freezesUsed.has(thisWeek) }
}
