import "server-only"

import { and, eq, gt, isNull } from "drizzle-orm"

import { HttpError } from "@/lib/api"
import { formatTimeLeft } from "@/lib/days"
import { getDb, schema } from "@/lib/db"
import { env } from "@/lib/env"
import { checkIn, claimNight, currentNightView, getState, topActiveGoal } from "@/lib/game"
import type { User } from "@/lib/session"
import { answerCallback, sendMessage, type InlineButton } from "@/lib/telegram"

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

async function userByTelegram(telegramId: number) {
  const [user] = await getDb().select().from(users).where(eq(users.telegramId, telegramId))
  return user ?? null
}

const appLink = (path = "/app") => `${env.appUrl()}${path}`

export async function handleUpdate(update: TgUpdate) {
  if (update.callback_query) return handleCallback(update.callback_query)
  const msg = update.message
  if (!msg?.text || !msg.from || msg.chat.type !== "private") return

  const chatId = msg.chat.id
  const text = msg.text.trim()
  const [command, arg] = text.split(/\s+/, 2)

  if (command === "/start") return start(chatId, msg.from.id, arg)

  const user = await userByTelegram(msg.from.id)
  if (!user) {
    return sendMessage(
      chatId,
      "Link your wallet first. Open Quest Chog on the web, go to your Chog sheet and tap LINK TELEGRAM.",
      [[{ text: "Open Quest Chog", url: appLink("/app/chog") }]],
    )
  }

  switch (command) {
    case "/night":
      return sendNight(chatId, user)
    case "/goals":
      return sendGoals(chatId, user)
    case "/mute":
      await setMuted(user.id, !user.telegramMuted)
      return sendMessage(
        chatId,
        user.telegramMuted ? "Nudges are back on." : "Muted. No more nudges. Send /mute again to undo.",
      )
    default:
      if (text.startsWith("/")) {
        return sendMessage(chatId, "Commands: /night, /goals, /mute. Or just tell me what you did today.")
      }
      return plainCheckIn(chatId, user, text)
  }
}

async function start(chatId: number, telegramId: number, code?: string) {
  if (!code) {
    const linked = await userByTelegram(telegramId)
    return sendMessage(
      chatId,
      linked
        ? "You are linked. Try /night for last night's diary or /goals to check in."
        : "Welcome to Quest Chog. To link your wallet, open the web app, go to your Chog sheet and tap LINK TELEGRAM. Goals are created on the web only.",
      [[{ text: "Open Quest Chog", url: appLink() }]],
    )
  }
  const db = getDb()
  const [row] = await db
    .update(linkCodes)
    .set({ telegramId })
    .where(and(eq(linkCodes.code, code.toUpperCase()), isNull(linkCodes.usedAt), gt(linkCodes.expiresAt, new Date())))
    .returning()
  if (!row) return sendMessage(chatId, "That link code expired. Make a new one on the web.")
  // The wallet must sign a message containing this Telegram ID before the link is stored.
  return sendMessage(chatId, "One last step: confirm with your wallet so we know it is you.", [
    [{ text: "Confirm with wallet", url: appLink(`/link?code=${row.code}`) }],
  ])
}

async function sendNight(chatId: number, user: User) {
  const current = await currentNightView(user)
  if (!current) return sendMessage(chatId, "Pick your Chog on the web first.", [[{ text: "Open Quest Chog", url: appLink("/start") }]])
  const n = current.view
  const items = n.items.map((i) => `- ${i.name} (${i.rarity})`).join("\n")
  const status = n.claimed
    ? "Claimed. Safe in your Chronicle."
    : n.claimable
      ? `${formatTimeLeft(new Date(n.expiresAt))} left to claim.`
      : "This night slipped away."
  const buttons: InlineButton[][] = n.claimable
    ? [
        [{ text: `Claim ${n.items.length} items`, callback_data: `claim:${n.day}` }],
        [
          { text: "Remind me later", callback_data: "later" },
          { text: "Mute", callback_data: "mute" },
        ],
      ]
    : [[{ text: "Open Quest Chog", url: appLink() }]]
  return sendMessage(
    chatId,
    `NIGHT ${n.number} // ${n.title}\n\n${n.diary}\n\n${items}\n\n${status}`,
    buttons,
  )
}

async function sendGoals(chatId: number, user: User) {
  const state = await getState(user)
  if (!state.chog) return sendMessage(chatId, "Pick your Chog on the web first.", [[{ text: "Open Quest Chog", url: appLink("/start") }]])
  const yours = state.quests.filter((q) => q.owner === "you" && q.status === "active")
  if (yours.length === 0) {
    return sendMessage(chatId, "No active goals. Goals are created on the web.", [[{ text: "Add a goal", url: appLink("/app/quests") }]])
  }
  const lines = yours.map((q) => `${q.name}: ${q.stepsDone}/${q.stepsTotal}${q.checkedInToday ? " (done today)" : ""}`)
  const buttons = yours
    .filter((q) => !q.checkedInToday)
    .map((q) => [{ text: `Check in: ${q.name}`.slice(0, 60), callback_data: `checkin:${q.id}` }])
  return sendMessage(chatId, `Your quests\n\n${lines.join("\n")}`, buttons.length ? buttons : undefined)
}

async function plainCheckIn(chatId: number, user: User, note: string) {
  const goal = await topActiveGoal(user)
  if (!goal) return sendMessage(chatId, "No active goal to check in on. Add one on the web.")
  try {
    const res = await checkIn(user, goal.id, note)
    return sendMessage(chatId, checkInReply(res))
  } catch (err) {
    if (err instanceof HttpError) return sendMessage(chatId, err.message)
    throw err
  }
}

function checkInReply(res: Awaited<ReturnType<typeof checkIn>>) {
  const parts = [`Checked in. +${res.xp} XP.`]
  if (res.questCompleted) parts.push("Quest complete. Make a card on the web.")
  if (res.chogQuestCompleted) parts.push("Your Chog finished its quest too.")
  else if (res.chogAdvanced) parts.push("Your Chog moved a step closer on its quest.")
  return parts.join(" ")
}

async function setMuted(userId: number, muted: boolean) {
  await getDb().update(users).set({ telegramMuted: muted }).where(eq(users.id, userId))
}

async function handleCallback(cb: TgCallback) {
  const user = await userByTelegram(cb.from.id)
  const chatId = cb.message?.chat.id
  if (!user || !chatId) return answerCallback(cb.id, "Link your wallet first.")
  const [action, arg] = (cb.data ?? "").split(":")

  try {
    if (action === "claim") {
      const res = await claimNight(user, "telegram", arg || undefined)
      await answerCallback(cb.id, "Claimed")
      return sendMessage(
        chatId,
        `Claimed. +${res.xpGain} XP. Streak ${res.streak}.${res.txHash ? "\nRecorded on Monad." : ""}`,
      )
    }
    if (action === "checkin") {
      const res = await checkIn(user, Number(arg))
      await answerCallback(cb.id, "Checked in")
      return sendMessage(chatId, checkInReply(res))
    }
    if (action === "later") return answerCallback(cb.id, "Okay. I will nudge you this evening.")
    if (action === "mute") {
      await setMuted(user.id, true)
      return answerCallback(cb.id, "Muted. Send /mute to undo.")
    }
    return answerCallback(cb.id)
  } catch (err) {
    if (err instanceof HttpError) return answerCallback(cb.id, err.message.slice(0, 190))
    throw err
  }
}
