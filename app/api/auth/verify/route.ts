import { and, eq, gt } from "drizzle-orm"
import { getAddress, verifyMessage, type Hex } from "viem"

import { handle, HttpError, json, readJson } from "@/lib/api"
import { parseSignInMessage } from "@/lib/auth-message"
import { getDb, schema } from "@/lib/db"
import { setSession } from "@/lib/session"

export const POST = handle(async (req: Request) => {
  const { message, signature } = await readJson<{ message?: string; signature?: Hex }>(req)
  const parsed = message ? parseSignInMessage(message) : null
  if (!parsed || !signature) throw new HttpError(400, "Invalid sign-in.")

  const db = getDb()
  const used = await db
    .delete(schema.authNonces)
    .where(and(eq(schema.authNonces.nonce, parsed.nonce), gt(schema.authNonces.expiresAt, new Date())))
    .returning()
  if (used.length === 0) throw new HttpError(401, "Sign-in expired. Try again.")

  const valid = await verifyMessage({ address: parsed.address, message: message!, signature })
  if (!valid) throw new HttpError(401, "Signature did not match the wallet.")

  const address = getAddress(parsed.address)
  const [user] = await db
    .insert(schema.users)
    .values({ walletAddress: address })
    .onConflictDoUpdate({ target: schema.users.walletAddress, set: { walletAddress: address } })
    .returning()
  await setSession(user.id)
  return json({ address, activeChog: user.activeChogTokenId })
})
