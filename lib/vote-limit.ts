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
