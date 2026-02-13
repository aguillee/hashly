import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTodayUTC, SENTIMENT_TOPIC_ID } from "@/lib/hcs";
import { z } from "zod";

const voteSchema = z.object({
  category: z.enum(["nft", "network", "hbar"]),
  vote: z.enum(["bullish", "bearish"]),
  hcsTransactionId: z.string().optional(),
  hcsSequenceNumber: z.number().optional(),
});

/**
 * POST /api/sentiment/vote
 * Submit a sentiment vote (requires HCS transaction proof)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "vote");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = voteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid vote data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { category, vote, hcsTransactionId, hcsSequenceNumber } = validation.data;
    const today = getTodayUTC();

    // Check if HCS is required (production only)
    if (SENTIMENT_TOPIC_ID && !hcsTransactionId) {
      return NextResponse.json(
        {
          error: "HCS transaction required",
          topicId: SENTIMENT_TOPIC_ID,
          message: "Please submit your vote to the HCS topic first",
        },
        { status: 400 }
      );
    }

    // Check if already voted today for this category
    const existingVote = await prisma.sentimentVote.findUnique({
      where: {
        walletAddress_category_date: {
          walletAddress: user.walletAddress,
          category: category.toUpperCase() as "NFT" | "NETWORK" | "HBAR",
          date: today,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        {
          error: "Already voted",
          message: `You already voted ${existingVote.vote.toLowerCase()} for ${category} today`,
          votedAt: existingVote.createdAt,
        },
        { status: 409 }
      );
    }

    // Create the vote
    const sentimentVote = await prisma.sentimentVote.create({
      data: {
        walletAddress: user.walletAddress,
        category: category.toUpperCase() as "NFT" | "NETWORK" | "HBAR",
        vote: vote.toUpperCase() as "BULLISH" | "BEARISH",
        date: today,
        hcsTransactionId: hcsTransactionId || null,
        hcsSequenceNumber: hcsSequenceNumber ? BigInt(hcsSequenceNumber) : null,
      },
    });

    // Update daily aggregates
    await updateDailyAggregates(today);

    return NextResponse.json({
      success: true,
      vote: {
        category,
        vote,
        date: today,
        hcsTransactionId,
      },
    });
  } catch (error) {
    console.error("Failed to submit sentiment vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}

/**
 * Update or create daily aggregates
 */
async function updateDailyAggregates(date: string) {
  // Count votes for the day
  const votes = await prisma.sentimentVote.groupBy({
    by: ["category", "vote"],
    where: { date },
    _count: true,
  });

  const counts = {
    nftBullish: 0,
    nftBearish: 0,
    networkBullish: 0,
    networkBearish: 0,
    hbarBullish: 0,
    hbarBearish: 0,
  };

  votes.forEach((v) => {
    const key = `${v.category.toLowerCase()}${v.vote === "BULLISH" ? "Bullish" : "Bearish"}` as keyof typeof counts;
    counts[key] = v._count;
  });

  // Count unique voters
  const uniqueVoters = await prisma.sentimentVote.groupBy({
    by: ["walletAddress"],
    where: { date },
  });

  // Calculate scores
  const { calculateScore, calculateGlobalScore } = await import("@/lib/hcs");

  const nftScore = calculateScore(counts.nftBullish, counts.nftBearish);
  const networkScore = calculateScore(counts.networkBullish, counts.networkBearish);
  const hbarScore = calculateScore(counts.hbarBullish, counts.hbarBearish);
  const globalScore = calculateGlobalScore(nftScore, networkScore, hbarScore);

  // Upsert daily data
  await prisma.sentimentDaily.upsert({
    where: { date },
    create: {
      date,
      ...counts,
      nftScore,
      networkScore,
      hbarScore,
      globalScore,
      totalVoters: uniqueVoters.length,
    },
    update: {
      ...counts,
      nftScore,
      networkScore,
      hbarScore,
      globalScore,
      totalVoters: uniqueVoters.length,
    },
  });
}
