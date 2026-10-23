import "server-only"

import { createPublicClient, decodeEventLog, getAddress, http, parseAbi, type Address, type Hex } from "viem"

import { env } from "@/lib/env"

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
      address: env.chogNftAddress,
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

/**
 * Lists Chogs held by a wallet. Uses ERC721Enumerable when available, otherwise
 * checks ownerOf for every minted token. Returns null if neither works.
 */
export async function chogsOfOwner(address: string): Promise<number[] | null> {
  const client = chogClient()
  const owner = getAddress(address)
  const balance = await client.readContract({
    address: env.chogNftAddress,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: [owner],
  })
  const count = Math.min(Number(balance), MAX_LISTED)
  if (count === 0) return []
  try {
    const ids = await client.multicall({
      multicallAddress: MULTICALL3,
      allowFailure: false,
      contracts: Array.from({ length: count }, (_, i) => ({
        address: env.chogNftAddress,
        abi: erc721Abi,
        functionName: "tokenOfOwnerByIndex" as const,
        args: [owner, BigInt(i)] as const,
      })),
    })
    return ids.map(Number).sort((a, b) => a - b)
  } catch {
    // Some chains lack multicall3, or the contract is not enumerable. Try sequentially.
    try {
      const ids: number[] = []
      for (let i = 0; i < count; i++) {
        const id = await client.readContract({
          address: env.chogNftAddress,
          abi: erc721Abi,
          functionName: "tokenOfOwnerByIndex",
          args: [owner, BigInt(i)],
        })
        ids.push(Number(id))
      }
      return ids.sort((a, b) => a - b)
    } catch {
      return scanOwners(owner)
    }
  }
}

const MAX_SCAN = 5000
// Canonical Multicall3, deployed on Monad. Passed explicitly because the clients have no chain config.
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11"

/** For collections without ERC721Enumerable (Chog Genesis): check ownerOf for ids 0..totalSupply. */
async function scanOwners(owner: Address): Promise<number[] | null> {
  const client = chogClient()
  try {
    const supply = await client.readContract({ address: env.chogNftAddress, abi: erc721Abi, functionName: "totalSupply" })
    const ids = Array.from({ length: Math.min(Number(supply), MAX_SCAN) + 1 }, (_, i) => i)
    const owners = await client.multicall({
      multicallAddress: MULTICALL3,
      allowFailure: true,
      contracts: ids.map((id) => ({
        address: env.chogNftAddress,
        abi: erc721Abi,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
    })
    return ids
      .filter((_, i) => owners[i].status === "success" && getAddress(owners[i].result as Address) === owner)
      .slice(0, MAX_LISTED)
  } catch {
    return null
  }
}

export type ChogMeta = { tokenId: number; name: string; image: string | null }

const metaCache = new Map<number, { at: number; meta: ChogMeta }>()
const META_TTL = 60 * 60 * 1000

function resolveUri(uri: string) {
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7).replace(/^ipfs\//, "")}`
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

/** Reads the Chog's own image from its tokenURI metadata. Never draws or recreates art. */
export async function chogMetadata(tokenId: number): Promise<ChogMeta> {
  const hit = metaCache.get(tokenId)
  if (hit && Date.now() - hit.at < META_TTL) return hit.meta

  let meta: ChogMeta = { tokenId, name: `Chog #${tokenId}`, image: null }
  try {
    const uri = await chogClient().readContract({
      address: env.chogNftAddress,
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
      const res = await fetch(resolveUri(uri), { signal: AbortSignal.timeout(8000) })
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
    address: env.chronicleAddress(),
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
  const chronicle = getAddress(env.chronicleAddress())
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== chronicle) continue
    try {
      const ev = decodeEventLog({ abi: chronicleAbi, eventName: "NightClaimed", data: log.data, topics: log.topics })
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
    address: env.chronicleAddress(),
    abi: chronicleAbi,
    functionName: "chronicleOf",
    args: [BigInt(tokenId)],
  })
  return { xp: Number(xp), level, streak, lastClaimDay, claimed }
}
