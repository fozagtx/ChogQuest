import { handle, json, requireUser } from "@/lib/api"
import { randomCode } from "@/lib/crypto"
import { getDb, schema } from "@/lib/db"
import { telegramBotUrl } from "@/lib/config"

export const POST = handle(async () => {
  const user = await requireUser()
  const code = randomCode()
  await getDb()
    .insert(schema.linkCodes)
    .values({ code, userId: user.id, expiresAt: new Date(Date.now() + 15 * 60_000) })
  return json({ code, url: telegramBotUrl(code) })
})
