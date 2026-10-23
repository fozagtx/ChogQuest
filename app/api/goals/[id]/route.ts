import { handle, json, requireUser } from "@/lib/api"
import { dropGoal } from "@/lib/game"

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/goals/[id]">) => {
  const user = await requireUser()
  const { id } = await ctx.params
  await dropGoal(user, Number(id))
  return json({ ok: true })
})
