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
