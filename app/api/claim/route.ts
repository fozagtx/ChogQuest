import { handle, json, readJson, requireUser } from "@/lib/api"
import { claimNight } from "@/lib/game"

export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { day } = await readJson<{ day?: string }>(req)
  const valid = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
  return json(await claimNight(user, "web", valid ? day : undefined))
})
