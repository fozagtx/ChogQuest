// Days are UTC calendar dates as "YYYY-MM-DD". Chronicle stores the same day as
// a day number (days since the unix epoch).

const DAY_MS = 86_400_000

export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

export function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS)
}

export function startOfDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`)
}

/** ISO week key, used for the weekly free sleep-in. Weeks start Monday. */
export function weekKey(day: string): string {
  const d = startOfDay(day)
  const weekday = (d.getUTCDay() + 6) % 7
  return addDays(day, -weekday)
}

export function formatTimeLeft(until: Date, now = new Date()): string {
  const mins = Math.max(0, Math.floor((until.getTime() - now.getTime()) / 60_000))
  return `${Math.floor(mins / 60)}H ${mins % 60}M`
}
