// Neon Function: evening scheduler for Quest Chog.
// Neon Function Triggers POST here on a cron. The function verifies the delivery
// came from Neon, then calls the app's protected cron endpoint, which sends the
// evening Telegram nudge. The game logic stays in the app.

import { parseTriggerDelivery } from "@neon/functions/triggers"

const JOBS = new Set(["evening"])

const scheduler = {
  async fetch(request: Request): Promise<Response> {
    const job = new URL(request.url).pathname.replace(/^\/+/, "")
    if (request.method !== "POST" || !JOBS.has(job)) {
      return new Response("not found", { status: 404 })
    }

    // Only Neon's trigger deliveries carry a valid invocation id; public callers are rejected.
    const parsed = await parseTriggerDelivery(request)
    if (!parsed.ok) {
      return new Response(parsed.error, { status: parsed.error === "invalid_body" ? 400 : 401 })
    }

    const appUrl = process.env.APP_URL
    const secret = process.env.CRON_SECRET
    if (!appUrl || !secret) return new Response("scheduler not configured", { status: 500 })

    const res = await fetch(`${appUrl.replace(/\/+$/, "")}/api/cron/${job}`, {
      headers: { "x-cron-secret": secret },
      signal: AbortSignal.timeout(5 * 60_000),
    })
    const body = await res.text()
    console.log(`cron ${job} -> ${res.status} ${body.slice(0, 200)}`)
    return new Response(body, {
      status: res.ok ? 200 : 502,
      headers: { "content-type": "application/json" },
    })
  },
}

export default scheduler
