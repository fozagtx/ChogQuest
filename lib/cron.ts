import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"

import { safeEqual } from "@/lib/crypto"
import { today } from "@/lib/days"
import { getDb, schema } from "@/lib/db"
import { env } from "@/lib/env"
import { getOrCreateNight } from "@/lib/game"
import { sendMessage } from "@/lib/telegram"

const { users, notifications } = schema

export function cronAuthorized(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? ""
  return given.length > 0 && safeEqual(given, env.cronSecret)
}

/**
 * Evening nudge: one Telegram message per linked player per day, only when
 * tonight's items are still unclaimed. Muted players are skipped.
 */
export async function runEvening() {
  const day = today()
  const linked = await getDb()
    .select()
    .from(users)
    .where(and(isNotNull(users.activeChogTokenId), isNotNull(users.telegramId), eq(users.telegramMuted, false)))

  let sent = 0
  for (const user of linked) {
    const night = await getOrCreateNight(user.activeChogTokenId!, day)
    if (!night || night.claimedAt) continue

    // Record first so a retry or a second run never double-sends.
    const fresh = await getDb()
      .insert(notifications)
      .values({ userId: user.id, kind: "evening", day })
      .onConflictDoNothing()
      .returning({ id: notifications.id })
    if (fresh.length === 0) continue

    const count = night.items.length
    try {
      await sendMessage(user.telegramId!, `Your Chog is back with ${count} item${count > 1 ? "s" : ""}. Claim them before the end of tomorrow.`, [
        // Claims are signed by the player's own wallet, so the button opens the app.
        [{ text: `Claim ${count} in the app`, url: `${env.appUrl()}/app` }],
        [{ text: "Mute", callback_data: "mute" }],
      ])
      sent++
    } catch (err) {
      console.error(`evening nudge failed for user ${user.id}`, (err as Error).message)
    }
  }
  return { day, linked: linked.length, sent }
}
