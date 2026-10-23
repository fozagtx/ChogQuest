import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const goalOwner = pgEnum("goal_owner", ["you", "chog"])
export const goalStatus = pgEnum("goal_status", ["active", "done", "dropped"])
export const claimVia = pgEnum("claim_via", ["web", "telegram"])

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  activeChogTokenId: bigint("active_chog_token_id", { mode: "number" }),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  telegramMuted: boolean("telegram_muted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})

export const linkCodes = pgTable("link_codes", {
  code: text("code").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
})

export const goals = pgTable(
  "goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chogTokenId: bigint("chog_token_id", { mode: "number" }).notNull(),
    owner: goalOwner("owner").notNull(),
    titleEnc: text("title_enc").notNull(),
    stepsTotal: integer("steps_total").notNull(),
    stepsDone: integer("steps_done").notNull().default(0),
    status: goalStatus("status").notNull().default("active"),
    xpReward: integer("xp_reward").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("goals_user_chog_idx").on(t.userId, t.chogTokenId)],
)

export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    noteEnc: text("note_enc"),
    day: date("day").notNull(),
    xp: integer("xp").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("checkins_goal_day").on(t.goalId, t.day)],
)

export type NightItem = { id: number; name: string; rarity: "COMMON" | "RARE" | "EPIC" }

export const nights = pgTable(
  "nights",
  {
    id: serial("id").primaryKey(),
    chogTokenId: bigint("chog_token_id", { mode: "number" }).notNull(),
    day: date("day").notNull(),
    seedHash: text("seed_hash").notNull(),
    title: text("title").notNull(),
    diaryText: text("diary_text").notNull(),
    items: jsonb("items").$type<NightItem[]>().notNull(),
    rarityMax: text("rarity_max").$type<NightItem["rarity"]>().notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique("nights_chog_day").on(t.chogTokenId, t.day)],
)

export const claims = pgTable(
  "claims",
  {
    id: serial("id").primaryKey(),
    chogTokenId: bigint("chog_token_id", { mode: "number" }).notNull(),
    day: date("day").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    xpGain: integer("xp_gain").notNull(),
    streak: integer("streak").notNull(),
    txHash: text("tx_hash"),
    via: claimVia("via").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("claims_chog_day").on(t.chogTokenId, t.day)],
)

// XP ledger per Chog. Rows with claim_id null have not been written to Chronicle yet;
// the next claim carries them on-chain so the chain total matches this table.
export const xpEvents = pgTable(
  "xp_events",
  {
    id: serial("id").primaryKey(),
    chogTokenId: bigint("chog_token_id", { mode: "number" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").$type<"checkin" | "claim" | "quest_complete">().notNull(),
    amount: integer("amount").notNull(),
    day: date("day").notNull(),
    claimId: integer("claim_id").references(() => claims.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("xp_events_chog_idx").on(t.chogTokenId, t.day)],
)

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    day: date("day").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("notifications_user_kind_day").on(t.userId, t.kind, t.day)],
)

export const telegramUpdates = pgTable("telegram_updates", {
  updateId: bigint("update_id", { mode: "number" }).primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
})
