// End-to-end smoke test against a running app. Signs in with a wallet key,
// picks a Chog, sets a goal, checks in, claims the night and checks that a
// second claim is rejected.
//
//   BASE_URL=http://localhost:3000 SMOKE_PRIVATE_KEY=0x... SMOKE_TOKEN_ID=7 bun scripts/smoke.ts

import { privateKeyToAccount } from "viem/accounts"

const base = process.env.BASE_URL ?? "http://localhost:3000"
const key = process.env.SMOKE_PRIVATE_KEY as `0x${string}` | undefined
const tokenId = Number(process.env.SMOKE_TOKEN_ID)
if (!key || !Number.isInteger(tokenId)) {
  console.error("Set SMOKE_PRIVATE_KEY and SMOKE_TOKEN_ID")
  process.exit(1)
}

const account = privateKeyToAccount(key)
let cookie = ""

async function call<T>(path: string, body?: unknown, method?: string): Promise<{ status: number; data: T }> {
  const res = await fetch(base + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const set = res.headers.get("set-cookie")
  if (set) cookie = set.split(";")[0]
  return { status: res.status, data: (await res.json()) as T }
}

function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`, detail === undefined ? "" : JSON.stringify(detail))
  if (!ok) process.exitCode = 1
}

const nonce = await call<{ message: string }>("/api/auth/nonce", { address: account.address })
const signature = await account.signMessage({ message: nonce.data.message })
const verify = await call("/api/auth/verify", { message: nonce.data.message, signature })
check("sign in", verify.status === 200, verify.data)

const replay = await call("/api/auth/verify", { message: nonce.data.message, signature })
check("nonce cannot be reused", replay.status === 401)

const chogs = await call<{ chogs: { tokenId: number }[] }>("/api/chogs")
check("lists Chogs in wallet", chogs.status === 200 && chogs.data.chogs.some((c) => c.tokenId === tokenId), chogs.data)

const notMine = await call("/api/chog/select", { tokenId: tokenId + 100_000 })
check("rejects a Chog not in the wallet", notMine.status === 403)

const select = await call("/api/chog/select", { tokenId })
check("select Chog", select.status === 200, select.data)

const goal = await call<{ id: number }>("/api/goals", { title: "Smoke test goal", stepsTotal: 2 })
check("create goal", goal.status === 201, goal.data)

const checkin = await call<{ xp: number }>("/api/checkins", { goalId: goal.data.id, note: "did a thing" })
check("check in", checkin.status === 200 && checkin.data.xp >= 60, checkin.data)

const again = await call("/api/checkins", { goalId: goal.data.id })
check("second check-in same day rejected", again.status === 409)

type State = {
  chog: { xp: number; streak: number } | null
  night: { day: string; claimable: boolean; items: unknown[] } | null
  quests: { name: string }[]
}
const before = await call<State>("/api/state")
check("state has a night", before.status === 200 && before.data.night !== null, before.data.night)
check("goal title decrypted for owner", before.data.quests.some((q) => q.name === "Smoke test goal"))

const claim = await call<{ xpGain: number; txHash: string | null; streak: number }>("/api/claim", {
  day: before.data.night?.day,
})
check("claim night", claim.status === 200, claim.data)

const double = await call("/api/claim", { day: before.data.night?.day })
check("second claim same day rejected", double.status === 409, double.data)

const after = await call<State>("/api/state")
check("XP went up", (after.data.chog?.xp ?? 0) > (before.data.chog?.xp ?? 0), {
  before: before.data.chog?.xp,
  after: after.data.chog?.xp,
})

const del = await call("/api/me/data", undefined, "DELETE")
check("delete my data", del.status === 200)
const wiped = await call<State>("/api/state")
check("goals gone after delete", wiped.data.quests.every((q) => q.name !== "Smoke test goal"))

console.log(claim.data.txHash ? `claim tx ${claim.data.txHash}` : "Chronicle not configured: claim stored in DB only")
