import { handle, json, readJson, requireUser } from "@/lib/api"
import { createGoal } from "@/lib/game"

export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { title, stepsTotal } = await readJson<{ title?: string; stepsTotal?: number }>(req)
  const goal = await createGoal(user, String(title ?? ""), Number(stepsTotal ?? 3))
  return json(goal, 201)
})
