// Public app config. Nothing here is secret, so it lives in code, not in env vars.
// Secrets (database URL, session and encryption keys, bot token) stay in env.

export const MONAD_TESTNET = {
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadscan.com",
} as const

/** The Chog NFT, read-only. Same chain as Chronicle, so ownership can be checked on Monad testnet. */
export const CHOG_NFT = {
  name: "Chog Genesis (Testnet)",
  address: "0x11138917b6Dd0782C8Ef98AC7EBB0c3Bd5706ccE",
  chainId: MONAD_TESTNET.chainId,
} as const

export const CHRONICLE = {
  address: "0x6b52bBa2e20E1B3842dd2b297d5398d718e548b6",
  chainId: MONAD_TESTNET.chainId,
  deployTx: "0xf163983af9ce35133e2e610db587c9d2b303591602cbb93c41df399835fb739b",
  deployBlock: 73_415_961,
} as const

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
  return `${MONAD_TESTNET.explorer}/address/${address}`
}

export function explorerTx(hash: string) {
  return `${MONAD_TESTNET.explorer}/tx/${hash}`
}
