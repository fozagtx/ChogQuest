import { handle, json } from "@/lib/api"
import { clearSession } from "@/lib/session"

export const POST = handle(async () => {
  await clearSession()
  return json({ ok: true })
})
