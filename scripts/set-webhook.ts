// Registers the Telegram webhook.
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... APP_URL=https://... bun scripts/set-webhook.ts

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const appUrl = process.env.APP_URL
if (!token || !secret || !appUrl) {
  console.error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and APP_URL")
  process.exit(1)
}

async function call(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  console.log(method, await res.json())
}

await call("setWebhook", {
  url: `${appUrl}/api/telegram`,
  // Telegram only allows A-Z, a-z, 0-9, _ and - in the secret.
  secret_token: secret.replace(/[^A-Za-z0-9_-]/g, ""),
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
})
// The bot has no slash commands besides /start, so clear any old command list.
await call("deleteMyCommands", {})

export {}
