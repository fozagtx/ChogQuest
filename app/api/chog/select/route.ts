import { handle, json, readJson, requireUser } from "@/lib/api"
import { chogMetadata } from "@/lib/chain"
import { selectChog } from "@/lib/game"

export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { tokenId } = await readJson<{ tokenId?: number }>(req)
  await selectChog(user, Number(tokenId))
  return json({ chog: await chogMetadata(Number(tokenId)) })
})
