import "server-only"

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

// AES-256-GCM for goal titles and check-in notes. Stored as base64 of iv|tag|ciphertext.

function key() {
  const k = Buffer.from(env.dbEncKey, "base64")
  if (k.length !== 32) throw new Error("DB_ENC_KEY must be 32 bytes, base64 encoded")
  return k
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64")
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8")
}

export function hmac(secret: string, data: string): Buffer {
  return createHmac("sha256", secret).update(data).digest()
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function randomCode(bytes = 6) {
  return randomBytes(bytes).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
}

export function randomToken(bytes = 16) {
  return randomBytes(bytes).toString("hex").toUpperCase()
}
