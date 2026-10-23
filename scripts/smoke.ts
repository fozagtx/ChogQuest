// End-to-end smoke test against a running app. Signs in with a wallet key,
// picks a Chog, sets a goal, checks in, claims the night on Chronicle from the
// wallet itself, records it, and checks that a second claim is rejected.
//
//   BASE_URL=http://localhost:3000 SMOKE_PRIVATE_KEY=0x... SMOKE_TOKEN_ID=7 \
//   SMOKE_RPC_URL=https://testnet-rpc.monad.xyz bun scripts/smoke.ts

import { createPublicClient, createWalletClient, http, parseAbi } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { dayNumber } from "../lib/days"

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
  chronicle: { address: string }
  chog: { xp: number; streak: number } | null
  night: { day: string; claimable: boolean; items: unknown[] } | null
  quests: { name: string }[]
}
const before = await call<State>("/api/state")
check("state has a night", before.status === 200 && before.data.night !== null, before.data.night)
check("goal title decrypted for owner", before.data.quests.some((q) => q.name === "Smoke test goal"))

const rpc = http(process.env.SMOKE_RPC_URL ?? "https://testnet-rpc.monad.xyz")
const reader = createPublicClient({ transport: rpc })
const wallet = createWalletClient({ account, transport: rpc, chain: { id: await reader.getChainId(), name: "monad", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [] } } } })
const chronicleAbi = parseAbi(["function claimNight(uint256 tokenId, uint32 day) returns (uint16[])"])
const chronicle = before.data.chronicle.address as `0x${string}`
const claimDay = dayNumber(before.data.night!.day)

const txHash = await wallet.writeContract({
  address: chronicle,
  abi: chronicleAbi,
  functionName: "claimNight",
  args: [BigInt(tokenId), claimDay],
})
await reader.waitForTransactionReceipt({ hash: txHash })
const claim = await call<{ xpGain: number; txHash: string; streak: number }>("/api/claim", { txHash })
check("claim night on-chain and record it", claim.status === 200 && claim.data.txHash === txHash, claim.data)

const recordAgain = await call<{ xpGain: number }>("/api/claim", { txHash })
check("recording the same claim again is a no-op", recordAgain.status === 200, recordAgain.data)

let rejected = false
try {
  await reader.simulateContract({ account, address: chronicle, abi: chronicleAbi, functionName: "claimNight", args: [BigInt(tokenId), claimDay] })
} catch {
  rejected = true
}
check("second claim same day rejected on-chain", rejected)

const stranger = await call("/api/claim", { txHash: `0x${"ab".repeat(32)}` })
check("unknown transaction rejected", stranger.status >= 400, stranger.data)

const after = await call<State>("/api/state")
check("XP went up", (after.data.chog?.xp ?? 0) > (before.data.chog?.xp ?? 0), {
  before: before.data.chog?.xp,
  after: after.data.chog?.xp,
})

const del = await call("/api/me/data", undefined, "DELETE")
check("delete my data", del.status === 200)
const wiped = await call<State>("/api/state")
check("goals gone after delete", wiped.data.quests.every((q) => q.name !== "Smoke test goal"))

console.log(`claim tx ${claim.data.txHash}`)
