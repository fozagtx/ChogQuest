import "server-only"

import { env } from "@/lib/env"

export type InlineButton = { text: string; callback_data?: string; url?: string }

export async function tg(method: string, body: Record<string, unknown>) {
  const token = env.telegramBotToken()
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set")
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown }
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description}`)
  return data.result
}

export function sendMessage(chatId: number, text: string, buttons?: InlineButton[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  })
}

export function answerCallback(id: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) })
}

let bot: Promise<{ username: string } | null> | null = null

/**
 * Points Telegram at this app's webhook (once per server process) and returns the bot's username.
 * Needs only TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET on the server; nothing to run by hand.
 */
export function ensureBot() {
  bot ??= (async () => {
    const secret = env.telegramWebhookSecret()
    if (!env.telegramBotToken() || !secret) return null
    const me = (await tg("getMe", {})) as { username: string }
    await tg("setWebhook", {
      url: `${env.appUrl()}/api/telegram`,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    })
    // The bot has no slash commands besides /start.
    await tg("deleteMyCommands", {})
    return { username: me.username }
  })().catch((err) => {
    console.error("telegram setup failed", (err as Error).message)
    bot = null
    return null
  })
  return bot
}
