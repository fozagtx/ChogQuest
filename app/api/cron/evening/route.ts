import { handle, json } from "@/lib/api"
import { cronAuthorized, runEvening } from "@/lib/cron"

export const GET = handle(async (req: Request) => {
  if (!cronAuthorized(req)) return json({ error: "forbidden" }, 403)
  return json(await runEvening())
})
