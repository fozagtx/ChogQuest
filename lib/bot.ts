import "server-only"

import { and, eq, gt, isNull } from "drizzle-orm"

import { HttpError } from "@/lib/api"
import { getDb, schema } from "@/lib/db"
import { env } from "@/lib/env"
import { claimNight } from "@/lib/game"
import { answerCallback, sendMessage } from "@/lib/telegram"

// The bot does two things: link a wallet with /start CODE, and handle the
// Claim and Mute buttons on the evening nudge. Everything else lives in the app.

const { users, linkCodes, telegramUpdates } = schema

type TgUser = { id: number }
type TgMessage = { message_id: number; chat: { id: number; type: string }; from?: TgUser; text?: string }
type TgCallback = { id: string; from: TgUser; data?: string; message?: TgMessage }
export type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback }

/** Returns false when this update was already handled (Telegram retries). */
export async function markUpdate(updateId: number) {
  const rows = await getDb()
    .insert(telegramUpdates)
    .values({ updateId })
    .onConflictDoNothing()
    .returning({ id: telegramUpdates.updateId })
  return rows.length > 0
}

const openApp = () => [[{ text: "Open Quest Chog", url: `${env.appUrl()}/app` }]]

export async function handleUpdate(update: TgUpdate) {
  if (update.callback_query) return handleCallback(update.callback_query)
  const msg = update.message
  if (!msg?.text || !msg.from || msg.chat.type !== "private") return

  const [command, code] = msg.text.trim().split(/\s+/, 2)
  if (command === "/start" && code) return link(msg.chat.id, msg.from.id, code)

  const [linked] = await getDb().select({ id: users.id }).from(users).where(eq(users.telegramId, msg.from.id))
  return sendMessage(
    msg.chat.id,
    linked
      ? "You're linked. Each evening I'll let you know when your Chog's items are waiting."
      : "To link, open Quest Chog, go to your Chog sheet and tap LINK TELEGRAM.",
    openApp(),
  )
}

/**
 * The code is only shown to a signed-in wallet in the app and expires in 15
 * minutes, so presenting it here is enough to link this Telegram account.
 */
async function link(chatId: number, telegramId: number, code: string) {
  const db = getDb()
  const linked = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(linkCodes)
      .set({ usedAt: new Date() })
      .where(and(eq(linkCodes.code, code.toUpperCase()), isNull(linkCodes.usedAt), gt(linkCodes.expiresAt, new Date())))
      .returning({ userId: linkCodes.userId })
    if (!row) return false
    // A Telegram account links to one wallet at a time.
    await tx.update(users).set({ telegramId: null }).where(eq(users.telegramId, telegramId))
    await tx.update(users).set({ telegramId, telegramMuted: false }).where(eq(users.id, row.userId))
    return true
  })
  return sendMessage(
    chatId,
    linked
      ? "Linked. Each evening I'll let you know when your Chog's items are waiting."
      : "That link code expired. Make a new one in the app.",
    linked ? undefined : openApp(),
  )
}

async function handleCallback(cb: TgCallback) {
  const [user] = await getDb().select().from(users).where(eq(users.telegramId, cb.from.id))
  const chatId = cb.message?.chat.id
  if (!user || !chatId) return answerCallback(cb.id, "Link your wallet in the app first.")
  const [action, day] = (cb.data ?? "").split(":")

  if (action === "mute") {
    await getDb().update(users).set({ telegramMuted: true }).where(eq(users.id, user.id))
    await answerCallback(cb.id, "Muted")
    return sendMessage(chatId, "No more nudges. Link Telegram again in the app to turn them back on.")
  }

  if (action === "claim") {
    try {
      const res = await claimNight(user, "telegram", day || undefined)
      await answerCallback(cb.id, "Claimed")
      return sendMessage(chatId, `Claimed. +${res.xpGain} XP. Streak ${res.streak}.`)
    } catch (err) {
      if (err instanceof HttpError) return answerCallback(cb.id, err.message.slice(0, 190))
      throw err
    }
  }

  return answerCallback(cb.id)
}
