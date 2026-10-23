import { and, eq, gt, isNotNull, isNull } from "drizzle-orm"
import { verifyMessage, type Hex } from "viem"

import { handle, HttpError, json, readJson, requireUser } from "@/lib/api"
import { telegramLinkMessage } from "@/lib/auth-message"
import { getDb, schema } from "@/lib/db"

const { linkCodes, users } = schema

async function pendingLink(userId: number, code: string) {
  const [row] = await getDb()
    .select()
    .from(linkCodes)
    .where(
      and(
        eq(linkCodes.code, code),
        eq(linkCodes.userId, userId),
        isNull(linkCodes.usedAt),
        isNotNull(linkCodes.telegramId),
        gt(linkCodes.expiresAt, new Date()),
      ),
    )
  return row ?? null
}

/** Returns the message the wallet must sign to link this Telegram account. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser()
  const code = new URL(req.url).searchParams.get("code") ?? ""
  const row = await pendingLink(user.id, code)
  if (!row) throw new HttpError(404, "This link expired. Send /start with a new code.")
  return json({ telegramId: row.telegramId, message: telegramLinkMessage(user.walletAddress, row.telegramId!, code) })
})

export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { code, signature } = await readJson<{ code?: string; signature?: Hex }>(req)
  const row = code ? await pendingLink(user.id, code) : null
  if (!row || !signature) throw new HttpError(404, "This link expired. Send /start with a new code.")

  const message = telegramLinkMessage(user.walletAddress, row.telegramId!, row.code)
  const valid = await verifyMessage({ address: user.walletAddress as Hex, message, signature })
  if (!valid) throw new HttpError(401, "Signature did not match the wallet.")

  const db = getDb()
  await db.transaction(async (tx) => {
    // A Telegram account links to one wallet at a time.
    await tx.update(users).set({ telegramId: null }).where(eq(users.telegramId, row.telegramId!))
    await tx.update(users).set({ telegramId: row.telegramId }).where(eq(users.id, user.id))
    await tx.update(linkCodes).set({ usedAt: new Date() }).where(eq(linkCodes.code, row.code))
  })
  return json({ ok: true })
})
