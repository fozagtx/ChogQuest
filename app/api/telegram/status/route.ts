import { handle, json, requireUser } from "@/lib/api"
import { lastBotError } from "@/lib/bot"
import { ensureBot, tg } from "@/lib/telegram"

/** Telegram's view of the webhook: where it delivers, what is queued and the last delivery error. */
export const GET = handle(async () => {
  await requireUser()
  const bot = await ensureBot()
  if (!bot) return json({ bot: null })
  const info = (await tg("getWebhookInfo", {})) as {
    url: string
    pending_update_count: number
    last_error_date?: number
    last_error_message?: string
  }
  return json({
    bot: bot.username,
    url: info.url,
    pending: info.pending_update_count,
    lastError: info.last_error_message ?? null,
    lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
    lastBotError,
  })
})
