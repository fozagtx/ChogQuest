import "server-only"

import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  getAddress,
  http,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { env } from "@/lib/env"

const erc721Abi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
])

export const chronicleAbi = parseAbi([
  "function claimNight(uint256 tokenId, uint32 day, uint16[] itemIds, uint32 xpGain, uint32 streak, uint256 deadline, bytes signature)",
  "function chronicleOf(uint256 tokenId) view returns (uint64 xp, uint32 level, uint32 streak, uint32 lastClaimDay, bool hasClaimed)",
  "function itemCount(uint256 tokenId, uint16 itemId) view returns (uint32)",
  "event NightClaimed(uint256 indexed tokenId, uint32 indexed day, uint16[] itemIds, uint32 xpGain, uint64 newXp, uint32 newLevel, uint32 streak)",
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

/** Lists Chogs held by a wallet. Requires ERC721Enumerable; returns null if unsupported. */
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
      return null
    }
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

// ---------- Chronicle ----------

export type Voucher = {
  tokenId: bigint
  day: number
  itemIds: number[]
  xpGain: number
  streak: number
  deadline: bigint
}

const voucherTypes = {
  NightVoucher: [
    { name: "tokenId", type: "uint256" },
    { name: "day", type: "uint32" },
    { name: "itemsHash", type: "bytes32" },
    { name: "xpGain", type: "uint32" },
    { name: "streak", type: "uint32" },
    { name: "deadline", type: "uint256" },
  ],
} as const

export function itemsHash(itemIds: number[]): Hex {
  return keccak256(encodePacked(["uint16[]"], [itemIds]))
}

let cachedChainId: number | undefined
async function chainId() {
  cachedChainId ??= await monadClient().getChainId()
  return cachedChainId
}

export async function signVoucher(v: Voucher): Promise<Hex> {
  const signer = privateKeyToAccount(env.voucherSignerKey()!)
  return signer.signTypedData({
    domain: {
      name: "QuestChogChronicle",
      version: "1",
      chainId: await chainId(),
      verifyingContract: env.chronicleAddress()!,
    },
    types: voucherTypes,
    primaryType: "NightVoucher",
    message: {
      tokenId: v.tokenId,
      day: v.day,
      itemsHash: itemsHash(v.itemIds),
      xpGain: v.xpGain,
      streak: v.streak,
      deadline: v.deadline,
    },
  })
}

// Single web instance, so an in-process queue keeps relayer nonces in order.
let relayQueue: Promise<unknown> = Promise.resolve()

/** Relayer submits the signed claim and waits for the receipt. Returns the tx hash. */
export function relayClaim(v: Voucher, signature: Hex): Promise<Hex> {
  const run = async () => {
    const account = privateKeyToAccount(env.relayerKey()!)
    const transport = http(env.monadRpcUrl)
    const id = await chainId()
    const chain = {
      id,
      name: "monad",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [env.monadRpcUrl] } },
    }
    const wallet = createWalletClient({ account, chain, transport })
    const hash = await wallet.writeContract({
      address: env.chronicleAddress()!,
      abi: chronicleAbi,
      functionName: "claimNight",
      args: [v.tokenId, v.day, v.itemIds, v.xpGain, v.streak, v.deadline, signature],
    })
    const receipt = await monadClient().waitForTransactionReceipt({ hash, timeout: 60_000 })
    if (receipt.status !== "success") throw new Error(`claim tx reverted: ${hash}`)
    return hash
  }
  const next = relayQueue.then(run, run)
  relayQueue = next.catch(() => undefined)
  return next
}

export async function chronicleOf(tokenId: number) {
  const address = env.chronicleAddress()
  if (!address) return null
  const [xp, level, streak, lastClaimDay, hasClaimed] = await monadClient().readContract({
    address,
    abi: chronicleAbi,
    functionName: "chronicleOf",
    args: [BigInt(tokenId)],
  })
  return { xp: Number(xp), level, streak, lastClaimDay, hasClaimed }
}
