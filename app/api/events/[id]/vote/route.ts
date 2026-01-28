import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { VoteType } from "@prisma/client";
import {
  getWalletNFTs,
  DRAGON_TOKEN_ID,
  SANTUARIO_TOKEN_ID,
  DRAGON_VOTE_WEIGHT,
  SANTUARIO_VOTE_WEIGHT,
} from "@/lib/hedera";
import { checkRateLimit } from "@/lib/rate-limit";
import { voteSchema, validateRequest } from "@/lib/validations";

const POINTS_PER_VOTE = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting - stricter for vote manipulation prevention
  const rateLimitResponse = checkRateLimit(request, "vote");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: eventId } = await params;
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(voteSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { voteType, useNftVotes } = validation.data;

    // Check if event exists and is approved
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.isApproved) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check for existing regular vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    let regularVoteWeight = 0;
    let nftVoteWeight = 0;
    let nftVotesUsed: { tokenId: string; serialNumber: number; weight: number }[] = [];

    // Forever mints use permanent voting (like collections) - no 24h cooldown
    const isForeverMint = event.isForeverMint;

    // Handle regular vote
    if (existingVote) {
      if (isForeverMint) {
        // Forever mint: can change vote anytime (like collections)
        const oldVoteType = existingVote.voteType;

        if (voteType !== oldVoteType) {
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: {
              voteType: voteType as VoteType,
              createdAt: new Date(),
            },
          });

          // Calculate vote change
          if (voteType === "UP" && oldVoteType === "DOWN") {
            regularVoteWeight = 2; // -1 becomes +1
          } else if (voteType === "DOWN" && oldVoteType === "UP") {
            regularVoteWeight = -2; // +1 becomes -1
          }
        }
        // If same vote type, no change needed
      } else {
        // Regular event: Check 24h cooldown
        const hoursSinceVote =
          (Date.now() - existingVote.createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceVote < 24) {
          // Can't update regular vote yet, but can still use NFT votes
          if (!useNftVotes) {
            const hoursRemaining = Math.ceil(24 - hoursSinceVote);
            return NextResponse.json(
              {
                error: `You can vote again in ${hoursRemaining} hours`,
                hoursRemaining,
              },
              { status: 429 }
            );
          }
        } else {
          // Update existing regular vote
          const oldVoteType = existingVote.voteType;

          await prisma.vote.update({
            where: { id: existingVote.id },
            data: {
              voteType: voteType as VoteType,
              createdAt: new Date(),
            },
          });

          // Calculate vote change
          if (voteType === "UP" && oldVoteType === "DOWN") {
            regularVoteWeight = 2; // -1 becomes +1
          } else if (voteType === "DOWN" && oldVoteType === "UP") {
            regularVoteWeight = -2; // +1 becomes -1
          }
          // If same vote type, no change
        }
      }
    } else {
      // Create new regular vote
      regularVoteWeight = voteType === "UP" ? 1 : -1;

      await prisma.$transaction([
        prisma.vote.create({
          data: {
            userId: user.id,
            eventId,
            voteType: voteType as VoteType,
          },
        }),
        // Add points automatically
        prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: POINTS_PER_VOTE } },
        }),
        prisma.pointHistory.create({
          data: {
            userId: user.id,
            points: POINTS_PER_VOTE,
            actionType: "VOTE",
            description: `Voted on event: ${event.title}`,
          },
        }),
      ]);
    }

    // Handle NFT votes if requested
    if (useNftVotes) {
      const walletNFTs = await getWalletNFTs(user.walletAddress);

      // Get already used NFT serials for this event
      const usedNftVotes = await prisma.nftVote.findMany({
        where: {
          eventId,
          tokenId: { in: [DRAGON_TOKEN_ID, SANTUARIO_TOKEN_ID] },
        },
        select: {
          tokenId: true,
          serialNumber: true,
        },
      });

      const usedDragonSerials = new Set(
        usedNftVotes
          .filter(v => v.tokenId === DRAGON_TOKEN_ID)
          .map(v => v.serialNumber)
      );
      const usedSantuarioSerials = new Set(
        usedNftVotes
          .filter(v => v.tokenId === SANTUARIO_TOKEN_ID)
          .map(v => v.serialNumber)
      );

      // Find available dragon NFTs (not used in this event by any wallet)
      const availableDragons = walletNFTs.dragons.filter(
        d => !usedDragonSerials.has(d.serialNumber)
      );

      // Find available santuario NFTs
      const availableSantuario = walletNFTs.santuario.filter(
        s => !usedSantuarioSerials.has(s.serialNumber)
      );

      // Create NFT votes for dragons
      for (const dragon of availableDragons) {
        await prisma.nftVote.create({
          data: {
            tokenId: DRAGON_TOKEN_ID,
            serialNumber: dragon.serialNumber,
            walletAddress: user.walletAddress,
            eventId,
            voteType: voteType as VoteType,
            voteWeight: DRAGON_VOTE_WEIGHT,
          },
        });
        nftVotesUsed.push({
          tokenId: DRAGON_TOKEN_ID,
          serialNumber: dragon.serialNumber,
          weight: DRAGON_VOTE_WEIGHT,
        });
        nftVoteWeight += voteType === "UP" ? DRAGON_VOTE_WEIGHT : -DRAGON_VOTE_WEIGHT;
      }

      // Create NFT votes for El Santuario (only use first one, gives 20 votes)
      if (availableSantuario.length > 0) {
        const santuarioNft = availableSantuario[0];
        await prisma.nftVote.create({
          data: {
            tokenId: SANTUARIO_TOKEN_ID,
            serialNumber: santuarioNft.serialNumber,
            walletAddress: user.walletAddress,
            eventId,
            voteType: voteType as VoteType,
            voteWeight: SANTUARIO_VOTE_WEIGHT,
          },
        });
        nftVotesUsed.push({
          tokenId: SANTUARIO_TOKEN_ID,
          serialNumber: santuarioNft.serialNumber,
          weight: SANTUARIO_VOTE_WEIGHT,
        });
        nftVoteWeight += voteType === "UP" ? SANTUARIO_VOTE_WEIGHT : -SANTUARIO_VOTE_WEIGHT;
      }
    }

    // Update event vote counts
    const totalVoteChange = regularVoteWeight + nftVoteWeight;
    if (totalVoteChange !== 0) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          votesUp: { increment: totalVoteChange > 0 ? Math.abs(totalVoteChange) : 0 },
          votesDown: { increment: totalVoteChange < 0 ? Math.abs(totalVoteChange) : 0 },
        },
      });
    }

    // Get updated event
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        votesUp: true,
        votesDown: true,
      },
    });

    return NextResponse.json({
      success: true,
      newScore: (updatedEvent?.votesUp || 0) - (updatedEvent?.votesDown || 0),
      votesUp: updatedEvent?.votesUp || 0,
      votesDown: updatedEvent?.votesDown || 0,
      nftVotesUsed: nftVotesUsed.length > 0 ? nftVotesUsed : undefined,
      totalNftWeight: nftVoteWeight !== 0 ? Math.abs(nftVoteWeight) : undefined,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Failed to vote" },
      { status: 500 }
    );
  }
}
