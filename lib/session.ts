import "server-only"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

import { hmac, safeEqual } from "@/lib/crypto"
import { getDb, schema } from "@/lib/db"
import { env } from "@/lib/env"

const COOKIE = "qc_session"
const MAX_AGE = 60 * 60 * 24 * 30

type Payload = { uid: number; exp: number }

function sign(body: string) {
  return hmac(env.sessionSecret, body).toString("base64url")
}

export async function setSession(userId: number) {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE } satisfies Payload),
  ).toString("base64url")
  ;(await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(COOKIE)
}

export async function currentUser() {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null
  const [body, mac] = raw.split(".")
  if (!body || !mac || !safeEqual(mac, sign(body))) return null
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload
  if (payload.exp < Date.now() / 1000) return null
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, payload.uid))
  return user ?? null
}

export type User = typeof schema.users.$inferSelect
