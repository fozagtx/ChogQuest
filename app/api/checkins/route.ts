import { handle, json, readJson, requireUser } from "@/lib/api"
import { checkIn } from "@/lib/game"

export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { goalId, note } = await readJson<{ goalId?: number; note?: string }>(req)
  return json(await checkIn(user, Number(goalId), note))
})
