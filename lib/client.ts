"use client"

import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem"

import { MONAD, TEST_CHOG } from "@/lib/config"

// Browser helpers: API calls and the injected wallet (EIP-1193).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Request failed.")
  return data as T
}

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }

function provider(): Eip1193 {
  const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum
  if (!eth) throw new Error("No wallet found. Install a browser wallet like MetaMask or Rabby.")
  return eth
}

export async function connectWallet(): Promise<Address> {
  const accounts = (await provider().request({ method: "eth_requestAccounts" })) as string[]
  if (!accounts[0]) throw new Error("No account selected.")
  return getAddress(accounts[0])
}

export async function signMessage(account: Address, message: string) {
  const wallet = createWalletClient({ account, transport: custom(provider()) })
  return wallet.signMessage({ account, message })
}

/** Connects the wallet and signs in. Returns the server's view of the user. */
export async function signIn() {
  const address = await connectWallet()
  const { message } = await api<{ message: string }>("/api/auth/nonce", { body: { address } })
  const signature = await signMessage(address, message)
  return api<{ address: Address; activeChog: number | null }>("/api/auth/verify", {
    body: { message, signature },
  })
}

// ---------- claiming on-chain from the player's wallet ----------

const monadChain = defineChain({
  id: MONAD.chainId,
  name: MONAD.name,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD.rpcUrl] } },
  blockExplorers: { default: { name: "Monadscan", url: MONAD.explorer } },
})

const claimAbi = parseAbi([
  "function claimNight(uint256 tokenId, uint32 day) returns (uint16[] itemIds)",
  "error NotChogHolder()",
  "error DayNotClaimable()",
  "error AlreadyClaimed()",
  "error EnforcedPause()",
])

const revertMessages: Record<string, string> = {
  NotChogHolder: "This wallet does not hold that Chog.",
  DayNotClaimable: "This night can no longer be claimed.",
  AlreadyClaimed: "Already claimed. Safe in your Chronicle.",
  EnforcedPause: "Claims are paused for a moment. Try again later.",
}

async function switchToMonad() {
  const chainId = `0x${MONAD.chainId.toString(16)}`
  try {
    await provider().request({ method: "wallet_switchEthereumChain", params: [{ chainId }] })
  } catch (err) {
    // 4902: the wallet does not know the network yet.
    if ((err as { code?: number }).code !== 4902) throw err
    await provider().request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: MONAD.name,
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls: [MONAD.rpcUrl],
          blockExplorerUrls: [MONAD.explorer],
        },
      ],
    })
  }
}

/** Sends Chronicle.claimNight from the connected wallet and waits for it to land. */
export async function claimOnChain(chronicle: Address, tokenId: number, day: number): Promise<Hex> {
  const account = await connectWallet()
  await switchToMonad()
  const wallet = createWalletClient({ account, chain: monadChain, transport: custom(provider()) })
  const reader = createPublicClient({ chain: monadChain, transport: http() })
  try {
    const { request } = await reader.simulateContract({
      account,
      address: chronicle,
      abi: claimAbi,
      functionName: "claimNight",
      args: [BigInt(tokenId), day],
    })
    const hash = await wallet.writeContract(request)
    const receipt = await reader.waitForTransactionReceipt({ hash })
    if (receipt.status !== "success") throw new Error("The claim transaction failed.")
    return hash
  } catch (err) {
    if (err instanceof BaseError) {
      const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
      const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined
      if (name && revertMessages[name]) throw new Error(revertMessages[name])
      if (/insufficient funds/i.test(err.message)) {
        throw new Error("This wallet needs a little MON on Monad for gas. A claim costs about 0.02 MON.")
      }
    }
    throw err
  }
}

const testChogAbi = parseAbi(["function mint() returns (uint256 tokenId)", "error MintLimitReached()"])

/** Mints one free Test Chog to the connected wallet (gas only) and waits for it to land. */
export async function mintTestChog(): Promise<Hex> {
  const account = await connectWallet()
  await switchToMonad()
  const wallet = createWalletClient({ account, chain: monadChain, transport: custom(provider()) })
  const reader = createPublicClient({ chain: monadChain, transport: http() })
  try {
    const { request } = await reader.simulateContract({
      account,
      address: TEST_CHOG.address,
      abi: testChogAbi,
      functionName: "mint",
    })
    const hash = await wallet.writeContract(request)
    const receipt = await reader.waitForTransactionReceipt({ hash })
    if (receipt.status !== "success") throw new Error("The mint transaction failed.")
    return hash
  } catch (err) {
    if (err instanceof BaseError) {
      const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
      if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "MintLimitReached") {
        throw new Error(`Each wallet can mint up to ${TEST_CHOG.maxPerWallet} Test Chogs.`)
      }
      if (/insufficient funds/i.test(err.message)) {
        throw new Error("This wallet needs a little MON on Monad for gas. Minting costs well under 0.05 MON.")
      }
    }
    throw err
  }
}

export function errorMessage(err: unknown) {
  if (err instanceof Error) {
    if (/user (rejected|denied)/i.test(err.message)) return "You cancelled in your wallet."
    return err.message
  }
  return "Something went wrong."
}
