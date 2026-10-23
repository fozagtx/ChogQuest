"use client"

import { createWalletClient, custom, getAddress, type Address } from "viem"

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

export function errorMessage(err: unknown) {
  if (err instanceof Error) {
    if (/user (rejected|denied)/i.test(err.message)) return "You cancelled in your wallet."
    return err.message
  }
  return "Something went wrong."
}
