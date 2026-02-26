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
import { reserveVoteSlot } from "@/lib/vote-limit";
import { awardReferralCommission } from "@/lib/referral-points";

// Points awarded for token votes
const POINTS_PER_TOKEN_VOTE = 1;

// POST /api/tokens/[id]/vote - Vote on a token
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

    // Atomic daily vote limit: reserve a slot before any logic
    const voteSlot = await reserveVoteSlot(user.walletAddress);
    if (!voteSlot.reserved) {
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

    const { id: tokenId } = await params;

    // Validate token ID format (CUID)
    if (!tokenId || !/^c[a-z0-9]{24}$/.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid token ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input (reuse collection vote schema)
    const validation = validateRequest(collectionVoteSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { voteType, useNftVotes } = validation.data;

    // Check if token exists
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
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
    const existingVote = await prisma.tokenVote.findUnique({
      where: {
        walletAddress_tokenId: {
          walletAddress: user.walletAddress,
          tokenId,
        },
      },
    });

    let voteChange = 0;
    const newWeight = voteType === "UP" ? voteWeight : -voteWeight;

    if (existingVote) {
      // User is changing their vote - calculate the difference
      const oldWeight = existingVote.voteWeight;
      voteChange = newWeight - oldWeight;

      await prisma.tokenVote.update({
        where: { id: existingVote.id },
        data: {
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
          updatedAt: new Date(),
        },
      });
    } else {
      // New vote - give points for first-time vote on this token
      voteChange = newWeight;

      await prisma.tokenVote.create({
        data: {
          walletAddress: user.walletAddress,
          tokenId,
          voteWeight: newWeight,
          nftTokenId,
          nftSerials,
        },
      });

      // Award points for voting on a new token
      const dbUser = await prisma.user.findUnique({
        where: { walletAddress: user.walletAddress },
      });

      if (dbUser) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: dbUser.id },
            data: { points: { increment: POINTS_PER_TOKEN_VOTE } },
          }),
          prisma.pointHistory.create({
            data: {
              userId: dbUser.id,
              points: POINTS_PER_TOKEN_VOTE,
              actionType: "TOKEN_VOTE",
              description: `Voted on token: ${token.symbol}`,
            },
          }),
        ]);

        // Award 5% referral commission (fire-and-forget)
        awardReferralCommission(dbUser.id, POINTS_PER_TOKEN_VOTE, "TOKEN_VOTE");
      }
    }

    // Update token total votes
    if (voteChange !== 0) {
      await prisma.token.update({
        where: { id: tokenId },
        data: {
          totalVotes: { increment: voteChange },
        },
      });
    }

    // Get updated token
    const updatedToken = await prisma.token.findUnique({
      where: { id: tokenId },
      select: {
        totalVotes: true,
        tokenAddress: true,
      },
    });

    // Submit vote to HCS (wait for it to complete in serverless)
    if (updatedToken?.tokenAddress) {
      try {
        await submitAssetVoteToHCS(
          user.walletAddress,
          updatedToken.tokenAddress,
          "token",
          voteType.toLowerCase() as "up" | "down",
          walletNFTs.hasSantuario ? 1 : 0,
          walletNFTs.totalDragons
        );
      } catch (err) {
        console.error("HCS submit failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      totalVotes: updatedToken?.totalVotes || 0,
      yourVoteWeight: newWeight,
      nftBonus: useNftVotes ? voteWeight - 1 : 0,
      votesRemaining: voteSlot.remaining,
    });
  } catch (error) {
    console.error("Token vote error:", error);
    return NextResponse.json(
      { error: "Failed to vote" },
      { status: 500 }
    );
  }
}

// DELETE /api/tokens/[id]/vote - Remove vote from token
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

    const { id: tokenId } = await params;

    // Validate token ID format (CUID)
    if (!tokenId || !/^c[a-z0-9]{24}$/.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid token ID format" },
        { status: 400 }
      );
    }

    // Check for existing vote
    const existingVote = await prisma.tokenVote.findUnique({
      where: {
        walletAddress_tokenId: {
          walletAddress: user.walletAddress,
          tokenId,
        },
      },
    });

    if (!existingVote) {
      return NextResponse.json(
        { error: "No vote found" },
        { status: 404 }
      );
    }

    // Remove vote and update token total
    await prisma.$transaction([
      prisma.tokenVote.delete({
        where: { id: existingVote.id },
      }),
      prisma.token.update({
        where: { id: tokenId },
        data: {
          totalVotes: { decrement: existingVote.voteWeight },
        },
      }),
    ]);

    // Get updated token
    const updatedToken = await prisma.token.findUnique({
      where: { id: tokenId },
      select: {
        totalVotes: true,
      },
    });

    return NextResponse.json({
      success: true,
      totalVotes: updatedToken?.totalVotes || 0,
    });
  } catch (error) {
    console.error("Remove token vote error:", error);
    return NextResponse.json(
      { error: "Failed to remove vote" },
      { status: 500 }
    );
  }
}
