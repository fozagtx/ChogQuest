"use client"

import {
  getAccount,
  signMessage,
  simulateContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions"
import { BaseError, ContractFunctionRevertedError, parseAbi, type Address, type Hex } from "viem"

import { TEST_CHOG } from "@/lib/config"
import { monad, wagmiConfig } from "@/lib/wagmi"

// Browser helpers: API calls, plus wallet actions through ConnectKit/wagmi.

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

// ---------- wallet (ConnectKit + wagmi) ----------

function connectedAccount(): Address {
  const { address } = getAccount(wagmiConfig)
  if (!address) throw new Error("Connect your wallet first.")
  return address
}

export async function signIn() {
  const address = connectedAccount()
  const { message } = await api<{ message: string }>("/api/auth/nonce", { body: { address } })
  const signature = await signMessage(wagmiConfig, { account: address, message })
  return api<{ address: Address; activeChog: number | null }>("/api/auth/verify", {
    body: { message, signature },
  })
}

async function onMonad() {
  if (getAccount(wagmiConfig).chainId !== monad.id) await switchChain(wagmiConfig, { chainId: monad.id })
}

const claimAbi = parseAbi([
  "function claimNight(uint256 tokenId, uint32 day) returns (uint16[] itemIds)",
  "error NotChogHolder()",
  "error DayNotClaimable()",
  "error AlreadyClaimed()",
  "error EnforcedPause()",
])

const testChogAbi = parseAbi(["function mint() returns (uint256 tokenId)", "error MintLimitReached()"])

const revertMessages: Record<string, string> = {
  NotChogHolder: "This wallet does not hold that Chog.",
  DayNotClaimable: "This night can no longer be claimed.",
  AlreadyClaimed: "Already claimed. Safe in your Chronicle.",
  EnforcedPause: "Claims are paused for a moment. Try again later.",
  MintLimitReached: `Each wallet can mint up to ${TEST_CHOG.maxPerWallet} Test Chogs.`,
}

function friendlyChainError(err: unknown): never {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
    const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined
    if (name && revertMessages[name]) throw new Error(revertMessages[name])
    if (/insufficient funds/i.test(err.message)) {
      throw new Error("This wallet needs a little MON on Monad for gas (a few hundredths of a MON).")
    }
  }
  throw err
}

/** Sends Chronicle.claimNight from the connected wallet and waits for it to land. */
export async function claimOnChain(chronicle: Address, tokenId: number, day: number): Promise<Hex> {
  const account = connectedAccount()
  try {
    await onMonad()
    const { request } = await simulateContract(wagmiConfig, {
      account,
      address: chronicle,
      abi: claimAbi,
      functionName: "claimNight",
      args: [BigInt(tokenId), day],
    })
    const hash = await writeContract(wagmiConfig, request)
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    if (receipt.status !== "success") throw new Error("The claim transaction failed.")
    return hash
  } catch (err) {
    friendlyChainError(err)
  }
}

/** Mints one free Test Chog to the connected wallet (gas only) and waits for it to land. */
export async function mintTestChog(): Promise<Hex> {
  const account = connectedAccount()
  try {
    await onMonad()
    const { request } = await simulateContract(wagmiConfig, {
      account,
      address: TEST_CHOG.address,
      abi: testChogAbi,
      functionName: "mint",
    })
    const hash = await writeContract(wagmiConfig, request)
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    if (receipt.status !== "success") throw new Error("The mint transaction failed.")
    return hash
  } catch (err) {
    friendlyChainError(err)
  }
}

export function errorMessage(err: unknown) {
  if (err instanceof Error) {
    if (/user (rejected|denied)/i.test(err.message)) return "You cancelled in your wallet."
    return err.message
  }
  return "Something went wrong."
}
