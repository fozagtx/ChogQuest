import { handle, HttpError, json, requireUser } from "@/lib/api"
import { chogMetadata, chogsOfOwner } from "@/lib/chain"

export const GET = handle(async () => {
  const user = await requireUser()
  const ids = await chogsOfOwner(user.walletAddress)
  if (ids === null) {
    throw new HttpError(501, "Could not list your Chogs automatically. Enter your Chog's token ID.")
  }
  const chogs = await Promise.all(ids.map((id) => chogMetadata(id)))
  return json({ chogs, activeChog: user.activeChogTokenId })
})
