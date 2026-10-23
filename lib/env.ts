import "server-only"

import { CHOG_NFT, CHRONICLE, MONAD } from "@/lib/config"

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
  // Chain config lives in lib/config.ts. The DEV_* names exist only to point a
  // local run at anvil; ordinary env vars like CHRONICLE_ADDRESS are ignored on purpose.
  get monadRpcUrl() {
    return optional("DEV_MONAD_RPC_URL") ?? MONAD.rpcUrl
  },
  get chogRpcUrl() {
    return this.monadRpcUrl
  },
  get chogNftAddress() {
    return (optional("DEV_CHOG_NFT_ADDRESS") ?? CHOG_NFT.address) as `0x${string}`
  },
  chronicleAddress: () => (optional("DEV_CHRONICLE_ADDRESS") ?? CHRONICLE.address) as `0x${string}`,
  // Optional. Without it, diary pages use the built-in template.
  nebiusApiKey: () => optional("NEBIUS_API_KEY"),
  telegramBotToken: () => optional("TELEGRAM_BOT_TOKEN"),
  // Telegram only accepts A-Z, a-z, 0-9, _ and - in the secret; scripts/set-webhook.ts strips the same way.
  telegramWebhookSecret: () => optional("TELEGRAM_WEBHOOK_SECRET")?.replace(/[^A-Za-z0-9_-]/g, ""),
  // Render sets RENDER_EXTERNAL_URL on web services, so APP_URL is only needed elsewhere.
  appUrl: () => optional("APP_URL") ?? optional("RENDER_EXTERNAL_URL") ?? "http://localhost:3000",
}
