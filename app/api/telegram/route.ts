import { handle, json, readJson } from "@/lib/api"
import { handleUpdate, markUpdate, type TgUpdate } from "@/lib/bot"
import { safeEqual } from "@/lib/crypto"
import { env } from "@/lib/env"

export const POST = handle(async (req: Request) => {
  const expected = env.telegramWebhookSecret()
  const given = req.headers.get("x-telegram-bot-api-secret-token") ?? ""
  if (!expected || !safeEqual(given, expected)) return json({ error: "forbidden" }, 403)

  const update = await readJson<TgUpdate>(req)
  if (typeof update.update_id !== "number") return json({ ok: true })
  if (!(await markUpdate(update.update_id))) return json({ ok: true })
  try {
    await handleUpdate(update)
  } catch (err) {
    // Always 200 so Telegram does not retry forever; the update id is already recorded.
    console.error("telegram update failed", (err as Error).message)
  }
  return json({ ok: true })
})
