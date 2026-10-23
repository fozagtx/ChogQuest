import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres comes with every branch. DATABASE_URL is pulled into .env.local.
  auth: false,
  // Diary narration (lib/narrate.ts) calls models through the gateway.
  aiGateway: true,
  functions: {
    // Calls the app's /api/cron/* endpoints on schedule (replaces separate cron services).
    scheduler: {
      name: "Quest Chog scheduler",
      source: "./functions/scheduler.ts",
      env: {
        APP_URL: process.env.APP_URL!,
        CRON_SECRET: process.env.CRON_SECRET!,
      },
    },
  },
  triggers: {
    // 19:00 UTC: one Telegram nudge to players whose items are still unclaimed.
    "quest-evening": { type: "schedule", function: "scheduler", cron: "0 19 * * *", functionPath: "/evening" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
