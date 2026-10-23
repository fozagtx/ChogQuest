import { handle, json, requireUser } from "@/lib/api"
import { deleteMyData } from "@/lib/game"

export const DELETE = handle(async () => {
  await deleteMyData(await requireUser())
  return json({ ok: true })
})
