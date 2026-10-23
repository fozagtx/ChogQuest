import { handle, json, readJson, requireUser } from "@/lib/api"
import { recordClaim } from "@/lib/game"

/** The player claimed on-chain from their wallet; record that transaction. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { txHash } = await readJson<{ txHash?: string }>(req)
  return json(await recordClaim(user, String(txHash ?? "")))
})
