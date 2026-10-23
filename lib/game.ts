import "server-only"

import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm"
import { getAddress } from "viem"

import { HttpError } from "@/lib/api"
import { chogMetadata, chronicleFor, isChogOwner, verifyClaimTx } from "@/lib/chain"
import { chogLabel, isTestChog } from "@/lib/config"
import { decrypt, encrypt } from "@/lib/crypto"
import { addDays, dayFromNumber, startOfDay, today } from "@/lib/days"
import { getDb, schema, type Tx } from "@/lib/db"
import { env } from "@/lib/env"
import { itemById, type Rarity } from "@/lib/items"
import { narrateNight } from "@/lib/narrate"
import { rollNight } from "@/lib/night"
import { rateLimit } from "@/lib/rate-limit"
import type { User } from "@/lib/session"
import type { AppState, NightView, QuestView } from "@/lib/state-types"
import {
  CHECKIN_XP,
  CLAIM_XP,
  MAX_GOALS,
  computeStreak,
  levelProgress,
  questReward,
} from "@/lib/xp"

const { users, goals, checkins, nights, claims, xpEvents } = schema

// Chog quests come from a fixed list and advance one step per day the player checks in.
export const CHOG_QUESTS = [
  { name: "Find the golden crumb", steps: 3 },
  { name: "Befriend the pigeon", steps: 2 },
  { name: "Map the cupboard", steps: 4 },
  { name: "Return the odd scarf", steps: 3 },
  { name: "Count every moth", steps: 5 },
  { name: "Win the staring contest", steps: 3 },
]

// ---------- ownership ----------

const ownerCache = new Map<string, number>()
const OWNER_TTL = 60_000

async function verifyOwner(address: string, tokenId: number, fresh = false) {
  const key = `${address}:${tokenId}`
  const at = ownerCache.get(key)
  if (!fresh && at && Date.now() - at < OWNER_TTL) return true
  const ok = await isChogOwner(address, tokenId)
  if (ok) ownerCache.set(key, Date.now())
  else ownerCache.delete(key)
  return ok
}

export async function selectChog(user: User, tokenId: number) {
  if (!Number.isSafeInteger(tokenId) || tokenId < 0) throw new HttpError(400, "Invalid Chog.")
  if (!(await verifyOwner(user.walletAddress, tokenId, true))) {
    throw new HttpError(403, "That Chog is not in your wallet.")
  }
  const db = getDb()
  await db.update(users).set({ activeChogTokenId: tokenId }).where(eq(users.id, user.id))
  await ensureChogQuest(db, user.id, tokenId)
}

async function activeChog(user: User) {
  const tokenId = user.activeChogTokenId
  if (tokenId === null) return null
  if (!(await verifyOwner(user.walletAddress, tokenId))) {
    // The Chog moved wallets. Its inventory stays with it; this user just loses access.
    await getDb().update(users).set({ activeChogTokenId: null }).where(eq(users.id, user.id))
    return null
  }
  return tokenId
}

async function requireChog(user: User) {
  const tokenId = await activeChog(user)
  if (tokenId === null) throw new HttpError(409, "Pick your Chog first.")
  return tokenId
}

// ---------- quests ----------

type DbLike = ReturnType<typeof getDb> | Tx

async function ensureChogQuest(db: DbLike, userId: number, tokenId: number) {
  const existing = await db
    .select({ id: goals.id, status: goals.status })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.chogTokenId, tokenId), eq(goals.owner, "chog")))
  if (existing.some((g) => g.status === "active")) return
  const next = CHOG_QUESTS[existing.length % CHOG_QUESTS.length]
  await db.insert(goals).values({
    userId,
    chogTokenId: tokenId,
    owner: "chog",
    titleEnc: encrypt(next.name),
    stepsTotal: next.steps,
    xpReward: questReward(next.steps),
  })
}

export async function createGoal(user: User, title: string, stepsTotal: number) {
  const tokenId = await requireChog(user)
  const clean = title.trim().slice(0, 120)
  if (!clean) throw new HttpError(400, "Give your goal a name.")
  if (!Number.isInteger(stepsTotal) || stepsTotal < 1 || stepsTotal > 30) {
    throw new HttpError(400, "Steps must be between 1 and 30.")
  }
  const db = getDb()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(goals)
    .where(
      and(
        eq(goals.userId, user.id),
        eq(goals.chogTokenId, tokenId),
        eq(goals.owner, "you"),
        eq(goals.status, "active"),
      ),
    )
  if (count >= MAX_GOALS) throw new HttpError(409, `You can have up to ${MAX_GOALS} active goals.`)

  const [goal] = await db
    .insert(goals)
    .values({
      userId: user.id,
      chogTokenId: tokenId,
      owner: "you",
      titleEnc: encrypt(clean),
      stepsTotal,
      xpReward: questReward(stepsTotal),
    })
    .returning({ id: goals.id })
  await ensureChogQuest(db, user.id, tokenId)
  return goal
}

export async function dropGoal(user: User, goalId: number) {
  await getDb()
    .update(goals)
    .set({ status: "dropped" })
    .where(and(eq(goals.id, goalId), eq(goals.userId, user.id), eq(goals.owner, "you")))
}

/** Picks the goal a plain Telegram message checks in on: the active goal with most progress left. */
export async function topActiveGoal(user: User) {
  const tokenId = await activeChog(user)
  if (tokenId === null) return null
  const [goal] = await getDb()
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, user.id),
        eq(goals.chogTokenId, tokenId),
        eq(goals.owner, "you"),
        eq(goals.status, "active"),
      ),
    )
    .orderBy(asc(goals.createdAt))
    .limit(1)
  return goal ?? null
}

export type CheckInResult = {
  xp: number
  questCompleted: boolean
  chogAdvanced: boolean
  chogQuestCompleted: boolean
}

export async function checkIn(user: User, goalId: number, note?: string): Promise<CheckInResult> {
  if (!rateLimit(`checkin:${user.id}`, 20, 60_000)) throw new HttpError(429, "Slow down a little.")
  const tokenId = await requireChog(user)
  const day = today()
  const db = getDb()

  return db.transaction(async (tx) => {
    const [goal] = await tx
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.id, goalId),
          eq(goals.userId, user.id),
          eq(goals.chogTokenId, tokenId),
          eq(goals.owner, "you"),
        ),
      )
      .for("update")
    if (!goal) throw new HttpError(404, "Quest not found.")
    if (goal.status !== "active") throw new HttpError(409, "That quest is finished.")

    const inserted = await tx
      .insert(checkins)
      .values({
        userId: user.id,
        goalId,
        day,
        xp: CHECKIN_XP,
        noteEnc: note?.trim() ? encrypt(note.trim().slice(0, 500)) : null,
      })
      .onConflictDoNothing()
      .returning({ id: checkins.id })
    if (inserted.length === 0) throw new HttpError(409, "Already checked in on this quest today.")

    let xp = CHECKIN_XP
    const stepsDone = goal.stepsDone + 1
    const questCompleted = stepsDone >= goal.stepsTotal
    await tx
      .update(goals)
      .set({
        stepsDone,
        ...(questCompleted ? { status: "done" as const, completedAt: new Date() } : {}),
      })
      .where(eq(goals.id, goalId))
    await tx.insert(xpEvents).values({ chogTokenId: tokenId, userId: user.id, kind: "checkin", amount: CHECKIN_XP, day })
    if (questCompleted) {
      xp += goal.xpReward
      await tx
        .insert(xpEvents)
        .values({ chogTokenId: tokenId, userId: user.id, kind: "quest_complete", amount: goal.xpReward, day })
    }

    // Party feel: the Chog's quest advances once per day when you check in on anything.
    let chogAdvanced = false
    let chogQuestCompleted = false
    const [chogGoal] = await tx
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, user.id),
          eq(goals.chogTokenId, tokenId),
          eq(goals.owner, "chog"),
          eq(goals.status, "active"),
        ),
      )
      .for("update")
    if (chogGoal) {
      const tick = await tx
        .insert(checkins)
        .values({ userId: user.id, goalId: chogGoal.id, day, xp: 0 })
        .onConflictDoNothing()
        .returning({ id: checkins.id })
      if (tick.length > 0) {
        chogAdvanced = true
        const done = chogGoal.stepsDone + 1
        chogQuestCompleted = done >= chogGoal.stepsTotal
        await tx
          .update(goals)
          .set({
            stepsDone: done,
            ...(chogQuestCompleted ? { status: "done" as const, completedAt: new Date() } : {}),
          })
          .where(eq(goals.id, chogGoal.id))
        if (chogQuestCompleted) {
          xp += chogGoal.xpReward
          await tx.insert(xpEvents).values({
            chogTokenId: tokenId,
            userId: user.id,
            kind: "quest_complete",
            amount: chogGoal.xpReward,
            day,
          })
          await ensureChogQuest(tx, user.id, tokenId)
        }
      }
    }

    return { xp, questCompleted, chogAdvanced, chogQuestCompleted }
  })
}

// ---------- nights ----------

/** Generates (once) the night that ended on `day` for this Chog. */
export async function getOrCreateNight(tokenId: number, day: string) {
  const db = getDb()
  const find = () =>
    db.select().from(nights).where(and(eq(nights.chogTokenId, tokenId), eq(nights.day, day)))
  const [existing] = await find()
  if (existing) return existing

  const roll = await rollNight(tokenId, day)
  const story = await narrateNight(tokenId, roll)
  await db
    .insert(nights)
    .values({
      chogTokenId: tokenId,
      day,
      seedHash: roll.seedHash,
      title: story.title,
      diaryText: story.diary,
      items: roll.items.map(({ id, name, rarity }) => ({ id, name, rarity })),
      rarityMax: roll.rarityMax,
      // Claimable until the end of the next day (UTC).
      expiresAt: startOfDay(addDays(day, 2)),
    })
    .onConflictDoNothing()
  const [created] = await find()
  return created
}

async function lastClaimDay(db: DbLike, tokenId: number) {
  const [row] = await db
    .select({ day: claims.day })
    .from(claims)
    .where(eq(claims.chogTokenId, tokenId))
    .orderBy(desc(claims.day))
    .limit(1)
  return row?.day ?? null
}

/** The night to show: the oldest one still claimable, else the latest one. */
async function currentNight(tokenId: number) {
  await getOrCreateNight(tokenId, today())
  const db = getDb()
  const lastDay = await lastClaimDay(db, tokenId)
  const now = new Date()

  const open = await db
    .select()
    .from(nights)
    .where(
      and(
        eq(nights.chogTokenId, tokenId),
        isNull(nights.claimedAt),
        gte(nights.expiresAt, now),
        lastDay ? sql`${nights.day} > ${lastDay}` : sql`true`,
      ),
    )
    .orderBy(asc(nights.day))
    .limit(1)
  if (open[0]) return open[0]

  const [latest] = await db
    .select()
    .from(nights)
    .where(eq(nights.chogTokenId, tokenId))
    .orderBy(desc(nights.day))
    .limit(1)
  return latest ?? null
}

async function nightNumber(tokenId: number, day: string) {
  const [{ n }] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(nights)
    .where(and(eq(nights.chogTokenId, tokenId), sql`${nights.day} <= ${day}`))
  return n
}

async function streakFor(db: DbLike, tokenId: number, extraDay?: string) {
  const rows = await db
    .selectDistinct({ day: xpEvents.day })
    .from(xpEvents)
    .where(and(eq(xpEvents.chogTokenId, tokenId), inArray(xpEvents.kind, ["checkin", "claim"])))
  const days = rows.map((r) => r.day)
  if (extraDay) days.push(extraDay)
  return computeStreak(days, today())
}

export type ClaimResult = { day: string; xpGain: number; streak: number; txHash: string }

/**
 * Records a claim the player already made on-chain from their own wallet.
 * Chronicle checked ownership and rolled the items; here we confirm the
 * transaction and mirror it into the app's ledger. Safe to call twice.
 */
export async function recordClaim(user: User, txHash: string): Promise<ClaimResult> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new HttpError(400, "Invalid transaction hash.")
  if (!rateLimit(`claim:${user.id}`, 10, 60_000)) throw new HttpError(429, "Slow down a little.")

  let claim: Awaited<ReturnType<typeof verifyClaimTx>>
  try {
    claim = await verifyClaimTx(txHash as `0x${string}`)
  } catch {
    throw new HttpError(504, "Could not confirm the transaction yet. Try again in a moment.")
  }
  if (!claim) throw new HttpError(400, "That transaction is not a Chronicle claim.")
  if (claim.holder !== getAddress(user.walletAddress)) {
    throw new HttpError(403, "That claim was made by a different wallet.")
  }

  const day = dayFromNumber(claim.day)
  // Make sure the night exists (it normally does: the player saw its diary page).
  await getOrCreateNight(claim.tokenId, day)

  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(claims)
      .where(and(eq(claims.chogTokenId, claim.tokenId), eq(claims.day, day)))
    if (existing) {
      return { day, xpGain: existing.xpGain, streak: existing.streak, txHash: existing.txHash ?? txHash }
    }

    const { streak } = await streakFor(tx, claim.tokenId, today())
    const [inserted] = await tx
      .insert(claims)
      .values({ chogTokenId: claim.tokenId, day, userId: user.id, xpGain: CLAIM_XP, streak, txHash, via: "web" })
      .returning({ id: claims.id })
    await tx.insert(xpEvents).values({
      chogTokenId: claim.tokenId,
      userId: user.id,
      kind: "claim",
      amount: CLAIM_XP,
      day: today(),
      claimId: inserted.id,
    })
    await tx
      .update(nights)
      .set({ claimedAt: new Date() })
      .where(and(eq(nights.chogTokenId, claim.tokenId), eq(nights.day, day)))
    return { day, xpGain: CLAIM_XP, streak, txHash }
  })
}

// ---------- state ----------

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export async function getState(user: User): Promise<AppState> {
  const base: AppState = {
    user: {
      address: user.walletAddress,
      telegramLinked: user.telegramId !== null,
      telegramMuted: user.telegramMuted,
    },
    chog: null,
    night: null,
    quests: [],
    inventory: [],
    lostAndFound: { nights: 0, items: [] },
    weeklyXp: [],
    lastCompleted: null,
    chronicle: { address: env.chronicleAddress() },
  }

  const tokenId = await activeChog(user)
  if (tokenId === null) return base

  const db = getDb()
  const day = today()
  const [meta, night] = await Promise.all([chogMetadata(tokenId), currentNight(tokenId)])

  const [xpRow] = await db
    .select({ xp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(eq(xpEvents.chogTokenId, tokenId))
  const { streak, sleepInAvailable } = await streakFor(db, tokenId)
  const progress = levelProgress(xpRow.xp)

  const claimedNights = await db
    .select({ items: nights.items })
    .from(nights)
    .where(and(eq(nights.chogTokenId, tokenId), sql`${nights.claimedAt} is not null`))
  const counts = new Map<number, number>()
  for (const n of claimedNights) for (const it of n.items) counts.set(it.id, (counts.get(it.id) ?? 0) + 1)
  const inventory = [...counts.entries()]
    .map(([id, count]) => ({ ...itemById.get(id)!, count }))
    .filter((i) => i.name)
    .sort((a, b) => (a.rarity === b.rarity ? a.id - b.id : rarityOrder(b.rarity) - rarityOrder(a.rarity)))
  const itemTotal = [...counts.values()].reduce((a, b) => a + b, 0)
  const rare = inventory.filter((i) => i.rarity !== "COMMON").reduce((a, i) => a + i.count, 0)

  const lost = await db
    .select({ items: nights.items })
    .from(nights)
    .where(
      and(
        eq(nights.chogTokenId, tokenId),
        isNull(nights.claimedAt),
        lt(nights.expiresAt, new Date()),
        gte(nights.day, addDays(day, -7)),
      ),
    )

  const goalRows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, user.id), eq(goals.chogTokenId, tokenId), inArray(goals.status, ["active", "done"])))
    .orderBy(asc(goals.createdAt))
  const todays = goalRows.length
    ? await db
        .select({ goalId: checkins.goalId })
        .from(checkins)
        .where(and(inArray(checkins.goalId, goalRows.map((g) => g.id)), eq(checkins.day, day)))
    : []
  const doneToday = new Set(todays.map((c) => c.goalId))
  const quests: QuestView[] = goalRows.map((g) => ({
    id: g.id,
    owner: g.owner,
    name: decrypt(g.titleEnc),
    status: g.status,
    stepsDone: g.stepsDone,
    stepsTotal: g.stepsTotal,
    xpReward: g.xpReward,
    checkedInToday: doneToday.has(g.id),
  }))

  const completedYou = goalRows
    .filter((g) => g.owner === "you" && g.status === "done")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]
  const activeChogQuest = quests.find((q) => q.owner === "chog" && q.status === "active")
  const lastChogDone = quests.filter((q) => q.owner === "chog" && q.status === "done").at(-1)

  const weekStart = addDays(day, -6)
  const weekRows = await db
    .select({ day: xpEvents.day, xp: sql<number>`sum(${xpEvents.amount})::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.chogTokenId, tokenId), gte(xpEvents.day, weekStart)))
    .groupBy(xpEvents.day)
  const byDay = new Map(weekRows.map((r) => [r.day, r.xp]))
  const weeklyXp = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { day: d, label: WEEKDAY[startOfDay(d).getUTCDay()], xp: byDay.get(d) ?? 0 }
  })

  return {
    ...base,
    chronicle: { address: chronicleFor(tokenId) },
    chog: {
      tokenId,
      label: chogLabel(tokenId),
      isTest: isTestChog(tokenId),
      name: meta.name,
      image: meta.image,
      xp: xpRow.xp,
      level: progress.level,
      levelXp: progress.into,
      levelPct: progress.pct,
      streak,
      sleepInAvailable,
      nights: claimedNights.length,
      items: itemTotal,
      rare,
    },
    night: night ? await toNightView(tokenId, night) : null,
    quests,
    inventory,
    lostAndFound: {
      nights: lost.length,
      items: lost.flatMap((n) => n.items.map(({ name, rarity }) => ({ name, rarity }))),
    },
    weeklyXp,
    lastCompleted: completedYou
      ? {
          name: decrypt(completedYou.titleEnc),
          xpReward: completedYou.xpReward,
          chogQuest: lastChogDone
            ? { name: lastChogDone.name, done: true }
            : activeChogQuest
              ? { name: activeChogQuest.name, done: false }
              : null,
        }
      : null,
  }
}

function rarityOrder(r: Rarity) {
  return r === "EPIC" ? 2 : r === "RARE" ? 1 : 0
}

export async function toNightView(tokenId: number, n: typeof nights.$inferSelect): Promise<NightView> {
  const [claim] = await getDb()
    .select({ txHash: claims.txHash })
    .from(claims)
    .where(and(eq(claims.chogTokenId, tokenId), eq(claims.day, n.day)))
  return {
    day: n.day,
    number: await nightNumber(tokenId, n.day),
    title: n.title,
    diary: n.diaryText,
    items: n.items,
    rarityMax: n.rarityMax,
    claimed: n.claimedAt !== null,
    claimable: n.claimedAt === null && n.expiresAt > new Date(),
    expiresAt: n.expiresAt.toISOString(),
    txHash: claim?.txHash ?? null,
  }
}

export async function currentNightView(user: User) {
  const tokenId = await activeChog(user)
  if (tokenId === null) return null
  const night = await currentNight(tokenId)
  return night ? { tokenId, view: await toNightView(tokenId, night) } : null
}

export async function deleteMyData(user: User) {
  // Goals cascade to their check-ins. XP numbers and claimed items stay with the Chog.
  await getDb().delete(goals).where(eq(goals.userId, user.id))
}
