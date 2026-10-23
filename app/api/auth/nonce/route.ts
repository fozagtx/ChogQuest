import { getAddress, isAddress } from "viem"

import { handle, HttpError, json, readJson } from "@/lib/api"
import { randomToken } from "@/lib/crypto"
import { getDb, schema } from "@/lib/db"
import { signInMessage } from "@/lib/auth-message"

export const POST = handle(async (req: Request) => {
  const { address } = await readJson<{ address?: string }>(req)
  if (!address || !isAddress(address)) throw new HttpError(400, "Invalid wallet address.")
  const nonce = randomToken()
  await getDb()
    .insert(schema.authNonces)
    .values({ nonce, expiresAt: new Date(Date.now() + 10 * 60_000) })
  return json({ message: signInMessage(getAddress(address), nonce, new Date().toISOString()) })
})
