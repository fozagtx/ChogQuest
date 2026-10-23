import "server-only"

import { createPublicClient, decodeEventLog, getAddress, http, parseAbi, type Address, type Hex } from "viem"

import { IPFS_GATEWAY, TEST_CHOG, chogLabel, isTestChog } from "@/lib/config"
import { env } from "@/lib/env"

/** Which NFT contract and Chronicle a token belongs to: Chog Genesis, or the free Test Chogs. */
function nftFor(tokenId: number): Address {
  return isTestChog(tokenId) ? TEST_CHOG.address : env.chogNftAddress
}
function chronicleFor(tokenId: number): Address {
  return isTestChog(tokenId) ? TEST_CHOG.chronicle : env.chronicleAddress()
}
export { chronicleFor }

const erc721Abi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
])

export const chronicleAbi = parseAbi([
  "function claimNight(uint256 tokenId, uint32 day) returns (uint16[] itemIds)",
  "function rollNight(uint256 tokenId, uint32 day) pure returns (uint16[] ids)",
  "function chronicleOf(uint256 tokenId) view returns (uint64 xp, uint32 level, uint32 streak, uint32 lastClaimDay, bool claimed)",
  "function itemCount(uint256 tokenId, uint16 itemId) view returns (uint32)",
  "event NightClaimed(uint256 indexed tokenId, uint32 indexed day, address indexed holder, uint16[] itemIds, uint64 newXp, uint32 newLevel, uint32 streak)",
])

function chogClient() {
  return createPublicClient({ transport: http(env.chogRpcUrl) })
}

function monadClient() {
  return createPublicClient({ transport: http(env.monadRpcUrl) })
}

// ---------- Chog NFT (read only) ----------

export async function ownerOfChog(tokenId: number): Promise<Address | null> {
  try {
    const owner = await chogClient().readContract({
      address: nftFor(tokenId),
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })
    return getAddress(owner)
  } catch {
    return null
  }
}

export async function isChogOwner(address: string, tokenId: number) {
  const owner = await ownerOfChog(tokenId)
  return owner !== null && owner === getAddress(address)
}

const MAX_LISTED = 50
const MAX_SCAN = 5000
const SCAN_BATCH = 400
// Canonical Multicall3, deployed on Monad. Passed explicitly because the clients have no chain config.
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11"

/**
 * Lists a wallet's Chogs: real Chog Genesis first, then free Test Chogs.
 * Returns null only if the real collection could not be read at all.
 */
export async function chogsOfOwner(address: string): Promise<number[] | null> {
  const owner = getAddress(address)
  const [real, test] = await Promise.all([realChogsOf(owner), testChogsOf(owner).catch(() => [])])
  if (real === null && test.length === 0) return null
  return [...(real ?? []), ...test].slice(0, MAX_LISTED)
}

async function realChogsOf(owner: Address): Promise<number[] | null> {
  const client = chogClient()
  const nft = env.chogNftAddress
  const balance = await client.readContract({ address: nft, abi: erc721Abi, functionName: "balanceOf", args: [owner] })
  if (Number(balance) === 0) return []
  try {
    // ERC721Enumerable, when the collection supports it.
    const ids = await client.multicall({
      multicallAddress: MULTICALL3,
      allowFailure: false,
      contracts: Array.from({ length: Math.min(Number(balance), MAX_LISTED) }, (_, i) => ({
        address: nft,
        abi: erc721Abi,
        functionName: "tokenOfOwnerByIndex" as const,
        args: [owner, BigInt(i)] as const,
      })),
    })
    return ids.map(Number).sort((x, y) => x - y)
  } catch {
    // Chog Genesis is not enumerable: check ownerOf for every minted id.
    try {
      const supply = await client.readContract({ address: nft, abi: erc721Abi, functionName: "totalSupply" })
      const ids = Array.from({ length: Math.min(Number(supply), MAX_SCAN) + 1 }, (_, i) => i)
      return await scanOwners(nft, owner, ids)
    } catch {
      return null
    }
  }
}

async function testChogsOf(owner: Address): Promise<number[]> {
  const client = chogClient()
  const balance = await client.readContract({
    address: TEST_CHOG.address,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: [owner],
  })
  if (Number(balance) === 0) return []
  const supply = await client.readContract({ address: TEST_CHOG.address, abi: erc721Abi, functionName: "totalSupply" })
  const ids = Array.from({ length: Math.min(Number(supply), MAX_SCAN) }, (_, i) => TEST_CHOG.firstId + i)
  return scanOwners(TEST_CHOG.address, owner, ids)
}

/** ownerOf for each id in batches, keeping the ones `owner` holds. */
async function scanOwners(nft: Address, owner: Address, ids: number[]): Promise<number[]> {
  const client = chogClient()
  const held: number[] = []
  // Batches keep each eth_call small enough for public RPC limits.
  for (let i = 0; i < ids.length; i += SCAN_BATCH) {
    const batch = ids.slice(i, i + SCAN_BATCH)
    const owners = await client.multicall({
      multicallAddress: MULTICALL3,
      allowFailure: true,
      contracts: batch.map((id) => ({
        address: nft,
        abi: erc721Abi,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
    })
    batch.forEach((id, j) => {
      if (owners[j].status === "success" && getAddress(owners[j].result as Address) === owner) held.push(id)
    })
    if (held.length >= MAX_LISTED) break
  }
  return held.slice(0, MAX_LISTED)
}

export type ChogMeta = { tokenId: number; name: string; image: string | null }

const metaCache = new Map<number, { at: number; meta: ChogMeta }>()
const META_TTL = 60 * 60 * 1000

function resolveUri(uri: string) {
  if (uri.startsWith("ipfs://")) return `${IPFS_GATEWAY}${uri.slice(7).replace(/^ipfs\//, "")}`
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

/** Reads the Chog's own image from its tokenURI metadata. Never draws or recreates art. */
export async function chogMetadata(tokenId: number): Promise<ChogMeta> {
  const hit = metaCache.get(tokenId)
  if (hit && Date.now() - hit.at < META_TTL) return hit.meta

  let meta: ChogMeta = { tokenId, name: chogLabel(tokenId), image: null }
  try {
    const uri = await chogClient().readContract({
      address: nftFor(tokenId),
      abi: erc721Abi,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    })
    let json: { name?: string; image?: string }
    if (uri.startsWith("data:application/json;base64,")) {
      json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"))
    } else if (uri.startsWith("data:application/json")) {
      json = JSON.parse(decodeURIComponent(uri.slice(uri.indexOf(",") + 1)))
    } else {
      const res = await fetch(resolveUri(uri), { signal: AbortSignal.timeout(20_000) })
      json = await res.json()
    }
    meta = {
      tokenId,
      name: typeof json.name === "string" ? json.name : meta.name,
      image: typeof json.image === "string" ? resolveUri(json.image) : null,
    }
  } catch (err) {
    console.error(`metadata for Chog ${tokenId} failed`, (err as Error).message)
  }
  metaCache.set(tokenId, { at: Date.now(), meta })
  return meta
}

// ---------- Chronicle (read only: players claim from their own wallets) ----------

/** The night's items, rolled by the contract itself from (tokenId, day). */
export async function rollNightOnChain(tokenId: number, dayNumber: number): Promise<number[]> {
  const ids = await monadClient().readContract({
    address: chronicleFor(tokenId),
    abi: chronicleAbi,
    functionName: "rollNight",
    args: [BigInt(tokenId), dayNumber],
  })
  return ids.map(Number)
}

export type VerifiedClaim = { tokenId: number; day: number; holder: Address; itemIds: number[]; txHash: Hex }

/**
 * Confirms a claim transaction succeeded on Chronicle and returns its NightClaimed event.
 * The contract already checked the holder owns the Chog, so the server needs no key.
 */
export async function verifyClaimTx(txHash: Hex): Promise<VerifiedClaim | null> {
  const receipt = await monadClient().waitForTransactionReceipt({ hash: txHash, timeout: 60_000 })
  if (receipt.status !== "success") return null
  const chronicles = new Set([getAddress(env.chronicleAddress()), getAddress(TEST_CHOG.chronicle)])
  for (const log of receipt.logs) {
    if (!chronicles.has(getAddress(log.address))) continue
    try {
      const ev = decodeEventLog({ abi: chronicleAbi, eventName: "NightClaimed", data: log.data, topics: log.topics })
      // A token only counts on its own collection's Chronicle.
      if (getAddress(chronicleFor(Number(ev.args.tokenId))) !== getAddress(log.address)) continue
      return {
        tokenId: Number(ev.args.tokenId),
        day: ev.args.day,
        holder: getAddress(ev.args.holder),
        itemIds: ev.args.itemIds.map(Number),
        txHash,
      }
    } catch {
      // not a NightClaimed log
    }
  }
  return null
}

export async function chronicleOf(tokenId: number) {
  const [xp, level, streak, lastClaimDay, claimed] = await monadClient().readContract({
    address: chronicleFor(tokenId),
    abi: chronicleAbi,
    functionName: "chronicleOf",
    args: [BigInt(tokenId)],
  })
  return { xp: Number(xp), level, streak, lastClaimDay, claimed }
}
