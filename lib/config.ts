// Public app config. Nothing here is secret, so it lives in code, not in env vars.
// Secrets (database URL, session and encryption keys, bot token) stay in env.

export const MONAD = {
  name: "Monad",
  chainId: 143,
  rpcUrl: "https://rpc.monad.xyz",
  explorer: "https://monadscan.com",
} as const

/** The real Chog Genesis collection, read-only. Same chain as Chronicle, so the contract checks ownership itself. */
export const CHOG_NFT = {
  name: "Chog Genesis",
  address: "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763",
  chainId: MONAD.chainId,
} as const

export const CHRONICLE = {
  address: "0xB46cd62a826b94f07a507c5359F79F189200ec93",
  chainId: MONAD.chainId,
  deployTx: "0x6474bd30c171e7200e670f4fec7972eaac4276e6fa1afa30d4cf32dda2feef4b",
  deployBlock: 115_792_506,
} as const

/** IPFS gateway for Chog metadata and art. ipfs.io and dweb.link stopped serving direct requests. */
export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/"

export const TELEGRAM = {
  /** The bot's @username without the @. Empty until the bot is created; the app hides Telegram links then. */
  botUsername: "",
} as const

export const AI = {
  /** Diary narration runs on Nebius Token Factory (OpenAI-compatible). The key is NEBIUS_API_KEY. */
  baseUrl: "https://api.tokenfactory.nebius.com/v1",
  model: "Qwen/Qwen3.5-397B-A17B",
} as const

export function telegramBotUrl(startCode?: string) {
  if (!TELEGRAM.botUsername) return null
  return `https://t.me/${TELEGRAM.botUsername}${startCode ? `?start=${startCode}` : ""}`
}

export function explorerAddress(address: string) {
  return `${MONAD.explorer}/address/${address}`
}

export function explorerTx(hash: string) {
  return `${MONAD.explorer}/tx/${hash}`
}
