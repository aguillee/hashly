import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getWalletNFTs,
  DRAGON_TOKEN_ID,
  SANTUARIO_TOKEN_ID,
  DRAGON_VOTE_WEIGHT,
  SANTUARIO_VOTE_WEIGHT,
} from "@/lib/hedera";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectionVoteSchema, validateRequest } from "@/lib/validations";
import { submitAssetVoteToHCS } from "@/lib/hcs-votes";
import { checkVoteLimit, incrementVoteCount } from "@/lib/vote-limit";
import { awardReferralCommission } from "@/lib/referral-points";

// Points awarded for collection votes
const POINTS_PER_COLLECTION_VOTE = 1;

// POST /api/collections/[id]/vote - Vote on a collection
// Collections have PERMANENT votes (no 24h reset)
// Users can change their vote at any time
// NFT-based votes are ALWAYS verified against current ownership
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check daily vote limit
    const voteLimit = await checkVoteLimit(user.walletAddress);
    if (!voteLimit.canVote) {
      return NextResponse.json(
        {
          error: "Daily vote limit reached",
          remaining: 0,
          resetsAt: new Date(Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 1,
            0, 0, 0, 0
          )).toISOString()
        },
        { status: 429 }
      );
    }

    const { id: collectionId } = await params;

    // Validate collection ID format (CUID)
    if (!collectionId || !/^c[a-z0-9]{24}$/.test(collectionId)) {
      return NextResponse.json(
        { error: "Invalid collection ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateRequest(collectionVoteSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { voteType, useNftVotes } = validation.data;

    // Check if collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // ALWAYS check current NFT ownership to calculate vote weight
    const walletNFTs = await getWalletNFTs(user.walletAddress);

    // Calculate vote weight based on CURRENT NFT ownership
    let voteWeight = 1; // Base vote weight
    let nftTokenId: string | null = null;
    let nftSerials: string | null = null;

    if (useNftVotes) {
      // Dragons: each dragon = 1 vote
      const dragonVotes = walletNFTs.totalDragons * DRAGON_VOTE_WEIGHT;

      // El Santuario: 5 votes if owned
      const santuarioVotes = walletNFTs.hasSantuario ? SANTUARIO_VOTE_WEIGHT : 0;

      // Total NFT-based vote weight
      const totalNftWeight = dragonVotes + santuarioVotes;

      if (totalNftWeight > 0) {
        voteWeight = 1 + totalNftWeight; // Base vote + NFT votes

        // Track which NFTs were used
        if (walletNFTs.totalDragons > 0 && walletNFTs.hasSantuario) {
          nftTokenId = `${DRAGON_TOKEN_ID},${SANTUARIO_TOKEN_ID}`;
          nftSerials = [
            ...walletNFTs.dragons.map(d => `D:${d.serialNumber}`),
            ...walletNFTs.santuario.map(s => `S:${s.serialNumber}`),
          ].join(",");
        } else if (walletNFTs.totalDragons > 0) {
          nftTokenId = DRAGON_TOKEN_ID;
          nftSerials = walletNFTs.dragons.map(d => d.serialNumber).join(",");
        } else if (walletNFTs.hasSantuario) {
          nftTokenId = SANTUARIO_TOKEN_ID;
          nftSerials = walletNFTs.santuario.map(s => s.serialNumber).join(",");
        }
      }
    }

    // Check for existing vote
    const existingVote = await prisma.collectionVote.findUnique({
      where: {
        walletAddress_collectionId: {
          walletAddress: user.walletAddress,
          collectionId,
        },
      },
    });

    let voteChange = 0;
    const newWeight = voteType === "UP" ? voteWeight : -voteWeight;

    if (existingVote) {
      // User is changing their vote - calculate the difference
      const oldWeight = existingVote.voteWeight;
      voteChange = newWeight - oldWeight;

      if (voteChange === 0) {
        // Same vote direction and weight — no-op, don't consume daily vote
        return NextResponse.json({
          success: true,
          totalVotes: collection.totalVotes,
          yourVoteWeight: existingVote.voteWeight,
          nftBonus: 0,
          votesRemaining: voteLimit.remaining,
          alreadyVoted: true,
        });
      }

      await prisma.collectionVote.update({
        where: { id: existingVote.id },
        data: {
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
          updatedAt: new Date(),
        },
      });
    } else {
      // New vote - give points for first-time vote on this collection
      voteChange = newWeight;

      await prisma.collectionVote.create({
        data: {
          walletAddress: user.walletAddress,
          collectionId,
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
        },
      });

      // Award points for voting on a new collection
      const dbUser = await prisma.user.findUnique({
        where: { walletAddress: user.walletAddress },
      });

      if (dbUser) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: dbUser.id },
            data: { points: { increment: POINTS_PER_COLLECTION_VOTE } },
          }),
          prisma.pointHistory.create({
            data: {
              userId: dbUser.id,
              points: POINTS_PER_COLLECTION_VOTE,
              actionType: "COLLECTION_VOTE",
              description: `Voted on collection: ${collection.name}`,
            },
          }),
        ]);

        // Award 5% referral commission (fire-and-forget)
        awardReferralCommission(dbUser.id, POINTS_PER_COLLECTION_VOTE, "COLLECTION_VOTE");
      }
    }

    // Update collection total votes
    if (voteChange !== 0) {
      await prisma.collection.update({
        where: { id: collectionId },
        data: {
          totalVotes: { increment: voteChange },
        },
      });
    }

    // Get updated collection
    const updatedCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        totalVotes: true,
        tokenAddress: true,
      },
    });

    // Submit vote to HCS (wait for it to complete in serverless)
    if (updatedCollection?.tokenAddress) {
      try {
        await submitAssetVoteToHCS(
          user.walletAddress,
          updatedCollection.tokenAddress,
          "nft",
          voteType.toLowerCase() as "up" | "down",
          walletNFTs.hasSantuario ? 1 : 0,
          walletNFTs.totalDragons
        );
      } catch (err) {
        console.error("HCS submit failed:", err);
      }
    }

    // Increment daily vote count
    const updatedLimit = await incrementVoteCount(user.walletAddress);

    return NextResponse.json({
      success: true,
      totalVotes: updatedCollection?.totalVotes || 0,
      yourVoteWeight: newWeight,
      nftBonus: useNftVotes ? voteWeight - 1 : 0,
      votesRemaining: updatedLimit.remaining,
    });
  } catch (error) {
    console.error("Collection vote error:", error);
    return NextResponse.json(
      { error: "Failed to vote" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]/vote - Remove vote from collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: collectionId } = await params;

    // Validate collection ID format (CUID)
    if (!collectionId || !/^c[a-z0-9]{24}$/.test(collectionId)) {
      return NextResponse.json(
        { error: "Invalid collection ID format" },
        { status: 400 }
      );
    }

    // Check for existing vote
    const existingVote = await prisma.collectionVote.findUnique({
      where: {
        walletAddress_collectionId: {
          walletAddress: user.walletAddress,
          collectionId,
        },
      },
    });

    if (!existingVote) {
      return NextResponse.json(
        { error: "No vote found" },
        { status: 404 }
      );
    }

    // Remove vote and update collection total
    await prisma.$transaction([
      prisma.collectionVote.delete({
        where: { id: existingVote.id },
      }),
      prisma.collection.update({
        where: { id: collectionId },
        data: {
          totalVotes: { decrement: existingVote.voteWeight },
        },
      }),
    ]);

    // Get updated collection
    const updatedCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        totalVotes: true,
      },
    });

    return NextResponse.json({
      success: true,
      totalVotes: updatedCollection?.totalVotes || 0,
    });
  } catch (error) {
    console.error("Remove collection vote error:", error);
    return NextResponse.json(
      { error: "Failed to remove vote" },
      { status: 500 }
    );
  }
}
