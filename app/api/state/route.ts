import { handle, json, requireUser } from "@/lib/api"
import { getState } from "@/lib/game"

export const GET = handle(async () => json(await getState(await requireUser())))
