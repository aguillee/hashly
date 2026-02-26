import { prisma } from "@/lib/db";

const DAILY_VOTE_LIMIT = 5;

// Get current UTC date as string "YYYY-MM-DD"
function getUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Check if wallet can vote and get remaining votes
export async function checkVoteLimit(walletAddress: string): Promise<{
  canVote: boolean;
  remaining: number;
  used: number;
}> {
  const today = getUTCDateString();

  const record = await prisma.dailyVoteLimit.findUnique({
    where: {
      walletAddress_date: {
        walletAddress,
        date: today,
      },
    },
  });

  const used = record?.voteCount || 0;
  const remaining = Math.max(0, DAILY_VOTE_LIMIT - used);

  return {
    canVote: used < DAILY_VOTE_LIMIT,
    remaining,
    used,
  };
}

// Increment vote count for wallet (call this after successful vote)
export async function incrementVoteCount(walletAddress: string): Promise<{
  remaining: number;
  used: number;
}> {
  const today = getUTCDateString();

  const record = await prisma.dailyVoteLimit.upsert({
    where: {
      walletAddress_date: {
        walletAddress,
        date: today,
      },
    },
    update: {
      voteCount: { increment: 1 },
    },
    create: {
      walletAddress,
      date: today,
      voteCount: 1,
    },
  });

  const remaining = Math.max(0, DAILY_VOTE_LIMIT - record.voteCount);

  return {
    remaining,
    used: record.voteCount,
  };
}

// Atomic check-and-increment: reserves a vote slot only if under the daily limit.
// Uses a single SQL UPDATE with WHERE to prevent race conditions.
export async function reserveVoteSlot(walletAddress: string): Promise<{
  reserved: boolean;
  remaining: number;
  used: number;
}> {
  const today = getUTCDateString();

  // Ensure record exists (no-op if already exists)
  await prisma.dailyVoteLimit.upsert({
    where: { walletAddress_date: { walletAddress, date: today } },
    update: {},
    create: { walletAddress, date: today, voteCount: 0 },
  });

  // Atomic conditional increment: only succeeds if vote_count < limit
  const rowsAffected = await prisma.$executeRaw`
    UPDATE "daily_vote_limits"
    SET "vote_count" = "vote_count" + 1, "updated_at" = NOW()
    WHERE "wallet_address" = ${walletAddress}
      AND "date" = ${today}
      AND "vote_count" < ${DAILY_VOTE_LIMIT}
  `;

  // Read back the current state
  const record = await prisma.dailyVoteLimit.findUnique({
    where: { walletAddress_date: { walletAddress, date: today } },
  });
  const used = record?.voteCount || 0;
  const remaining = Math.max(0, DAILY_VOTE_LIMIT - used);

  if (rowsAffected === 0) {
    return { reserved: false, remaining: 0, used };
  }

  return { reserved: true, remaining, used };
}

// Get vote limit info for display in navbar
export async function getVoteLimitInfo(walletAddress: string): Promise<{
  limit: number;
  remaining: number;
  used: number;
  resetsAt: string; // ISO string of next 00:00 UTC
}> {
  const { remaining, used } = await checkVoteLimit(walletAddress);

  // Calculate next reset time (00:00 UTC tomorrow)
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));

  return {
    limit: DAILY_VOTE_LIMIT,
    remaining,
    used,
    resetsAt: tomorrow.toISOString(),
  };
}
