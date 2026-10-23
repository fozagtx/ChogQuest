import "server-only"

import { CHOG_NFT, CHRONICLE, MONAD_TESTNET } from "@/lib/contracts"

// Server-side configuration. Required values throw on first use so a missing
// secret fails loudly instead of silently degrading.

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var ${name}`)
  return value
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL")
  },
  get dbEncKey() {
    return required("DB_ENC_KEY")
  },
  get sessionSecret() {
    return required("SESSION_SECRET")
  },
  get cronSecret() {
    return required("CRON_SECRET")
  },
  get monadRpcUrl() {
    return optional("MONAD_RPC_URL") ?? MONAD_TESTNET.rpcUrl
  },
  // The Chog NFT may live on a different chain than Chronicle (mainnet vs testnet).
  get chogRpcUrl() {
    return optional("CHOG_RPC_URL") ?? this.monadRpcUrl
  },
  get chogNftAddress() {
    return (optional("CHOG_NFT_ADDRESS") ?? CHOG_NFT.address) as `0x${string}`
  },
  chronicleAddress: () => (optional("CHRONICLE_ADDRESS") ?? CHRONICLE.address) as `0x${string}`,
  // Neon AI Gateway (pulled by `neon deploy`). AI_API_KEY is a direct-Anthropic fallback.
  aiGatewayUrl: () => optional("NEON_AI_GATEWAY_BASE_URL"),
  aiGatewayToken: () => optional("NEON_AI_GATEWAY_TOKEN"),
  aiApiKey: () => optional("AI_API_KEY"),
  aiModel: () => optional("AI_MODEL") ?? "claude-haiku-5-5",
  telegramBotToken: () => optional("TELEGRAM_BOT_TOKEN"),
  // Telegram only accepts A-Z, a-z, 0-9, _ and - in the secret; scripts/set-webhook.ts strips the same way.
  telegramWebhookSecret: () => optional("TELEGRAM_WEBHOOK_SECRET")?.replace(/[^A-Za-z0-9_-]/g, ""),
  telegramBotUsername: () => optional("TELEGRAM_BOT_USERNAME"),
  // Render sets RENDER_EXTERNAL_URL on web services, so APP_URL is only needed elsewhere.
  appUrl: () => optional("APP_URL") ?? optional("RENDER_EXTERNAL_URL") ?? "http://localhost:3000",
}
