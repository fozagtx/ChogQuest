import { getAddress, isAddress, type Address } from "viem"

// Plain-text messages the wallet signs. Parsed back on the server, so keep the format fixed.

const SIGN_IN_HEADER = "Sign in to Quest Chog."

export function signInMessage(address: Address, nonce: string, issuedAt: string) {
  return `${SIGN_IN_HEADER}\n\nThis only proves you own this wallet. It costs nothing.\n\nAddress: ${address}\nNonce: ${nonce}\nIssued: ${issuedAt}`
}

export function parseSignInMessage(message: string): { address: Address; nonce: string } | null {
  if (!message.startsWith(SIGN_IN_HEADER)) return null
  const address = /^Address: (0x[0-9a-fA-F]{40})$/m.exec(message)?.[1]
  const nonce = /^Nonce: ([A-Z0-9]+)$/m.exec(message)?.[1]
  if (!address || !nonce || !isAddress(address)) return null
  return { address: getAddress(address), nonce }
}

export function telegramLinkMessage(address: string, telegramId: number, code: string) {
  return `Link Telegram to Quest Chog.\n\nWallet: ${getAddress(address)}\nTelegram ID: ${telegramId}\nCode: ${code}`
}
