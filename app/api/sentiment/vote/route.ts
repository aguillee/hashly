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

    // Verify the HCS transaction belongs to this user (prevents spoofing)
    if (hcsTransactionId) {
      const isValid = await verifyHcsTransaction(hcsTransactionId, user.walletAddress);
      if (!isValid) {
        return NextResponse.json(
          {
            error: "Invalid HCS transaction",
            message: "The transaction payer does not match your wallet address",
          },
          { status: 403 }
        );
      }
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
 * Verify that the HCS transaction was paid by the claimed wallet address
 * This prevents users from submitting votes with fake transaction IDs
 */
async function verifyHcsTransaction(
  transactionId: string,
  walletAddress: string
): Promise<boolean> {
  // Transaction ID format from wallet: "0.0.xxxxx@seconds.nanos"
  // Mirror node format: "0.0.xxxxx-seconds-nanos"
  const atIndex = transactionId.indexOf("@");
  if (atIndex === -1) {
    console.error("Invalid transaction ID format (no @):", transactionId);
    return false;
  }

  const accountId = transactionId.substring(0, atIndex);
  const timestamp = transactionId.substring(atIndex + 1).replace(".", "-");
  const mirrorTxId = `${accountId}-${timestamp}`;

  console.log(`Verifying HCS transaction: ${transactionId} -> ${mirrorTxId}`);

  // Retry with delays - mirror node can take a few seconds to index
  const maxRetries = 5;
  const delayMs = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://mainnet.mirrornode.hedera.com/api/v1/transactions/${mirrorTxId}`
      );

      if (response.status === 404) {
        // Transaction not yet indexed, wait and retry
        console.log(`Attempt ${attempt}/${maxRetries}: Transaction not yet indexed, waiting...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        console.error("Transaction not found after all retries");
        return false;
      }

      if (!response.ok) {
        console.error(`Failed to fetch transaction: ${response.status}`);
        return false;
      }

      const data = await response.json();

      // Check if any transaction in the response has this wallet as payer
      if (data.transactions && Array.isArray(data.transactions)) {
        for (const tx of data.transactions) {
          if (tx.transaction_id) {
            // Extract payer from transaction_id (format: "0.0.xxxxx-seconds-nanos")
            const payerMatch = tx.transaction_id.match(/^(\d+\.\d+\.\d+)-/);
            if (payerMatch) {
              const payer = payerMatch[1];
              if (payer.toLowerCase() === walletAddress.toLowerCase()) {
                console.log(`Transaction verified on attempt ${attempt}`);
                return true;
              }
            }
          }
        }
      }

      console.warn(
        `Transaction payer mismatch: expected ${walletAddress}, got different payer`
      );
      return false;
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} error:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error("Error verifying HCS transaction after all retries");
  return false;
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
