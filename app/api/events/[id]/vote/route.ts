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

    // Meetups can only receive positive votes (stars), no downvotes
    if (event.event_type === "ECOSYSTEM_MEETUP" && voteType === "DOWN") {
      return NextResponse.json(
        { error: "Ecosystem meetups can only receive positive votes" },
        { status: 400 }
      );
    }

    // Check for existing regular vote (use findFirst inside try to handle race conditions)
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

          // Calculate vote change for regular vote
          if (voteType === "UP" && oldVoteType === "DOWN") {
            regularVoteWeight = 2; // -1 becomes +1
          } else if (voteType === "DOWN" && oldVoteType === "UP") {
            regularVoteWeight = -2; // +1 becomes -1
          }

          // Also update existing NFT votes for this wallet on this event
          const existingNftVotes = await prisma.nftVote.findMany({
            where: {
              eventId,
              walletAddress: user.walletAddress,
            },
          });

          if (existingNftVotes.length > 0) {
            // Calculate total NFT weight
            const totalNftWeight = existingNftVotes.reduce((sum, v) => sum + v.voteWeight, 0);

            // Update all NFT votes to new voteType
            await prisma.nftVote.updateMany({
              where: {
                eventId,
                walletAddress: user.walletAddress,
              },
              data: {
                voteType: voteType as VoteType,
              },
            });

            // NFT vote weight change: totalNftWeight * 2 (because changing direction)
            if (voteType === "UP") {
              nftVoteWeight = totalNftWeight * 2; // Was -X, now +X
            } else {
              nftVoteWeight = -totalNftWeight * 2; // Was +X, now -X
            }
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
          // Update existing regular vote - 24h cooldown passed, can vote again
          const oldVoteType = existingVote.voteType;

          await prisma.vote.update({
            where: { id: existingVote.id },
            data: {
              voteType: voteType as VoteType,
              createdAt: new Date(),
            },
          });

          // Calculate vote change - every 24h the user can add +1 (UP) or -1 (DOWN)
          // If changing direction, we also need to undo the previous vote
          if (voteType === "UP" && oldVoteType === "DOWN") {
            regularVoteWeight = 2; // Remove old -1, add new +1
          } else if (voteType === "DOWN" && oldVoteType === "UP") {
            regularVoteWeight = -2; // Remove old +1, add new -1
          } else {
            // Same vote type - just add another vote in that direction
            regularVoteWeight = voteType === "UP" ? 1 : -1;
          }
        }
      }
    } else {
      // Create new regular vote — use try/catch to handle race condition (duplicate key)
      regularVoteWeight = voteType === "UP" ? 1 : -1;

      try {
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
      } catch (txError: any) {
        // P2002 = Unique constraint violation (race condition — vote already created)
        if (txError?.code === "P2002") {
          return NextResponse.json(
            { error: "Vote already recorded" },
            { status: 409 }
          );
        }
        throw txError;
      }
    }

    // Handle NFT votes if requested
    if (useNftVotes) {
      const walletNFTs = await getWalletNFTs(user.walletAddress);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get existing NFT votes for this wallet on this event
      const existingNftVotes = await prisma.nftVote.findMany({
        where: {
          eventId,
          walletAddress: user.walletAddress,
          tokenId: { in: [DRAGON_TOKEN_ID, SANTUARIO_TOKEN_ID] },
        },
      });

      // Map existing votes by tokenId+serialNumber for quick lookup
      const existingVoteMap = new Map(
        existingNftVotes.map(v => [`${v.tokenId}-${v.serialNumber}`, v])
      );

      // Process dragon NFTs - can vote again after 24h
      for (const dragon of walletNFTs.dragons) {
        const key = `${DRAGON_TOKEN_ID}-${dragon.serialNumber}`;
        const existingNftVote = existingVoteMap.get(key);

        if (existingNftVote) {
          // Check if 24h passed since last NFT vote
          if (existingNftVote.createdAt < twentyFourHoursAgo) {
            // Update existing NFT vote (reset timestamp, add weight)
            await prisma.nftVote.update({
              where: { id: existingNftVote.id },
              data: {
                voteType: voteType as VoteType,
                createdAt: new Date(),
              },
            });
            nftVotesUsed.push({
              tokenId: DRAGON_TOKEN_ID,
              serialNumber: dragon.serialNumber,
              weight: DRAGON_VOTE_WEIGHT,
            });
            nftVoteWeight += voteType === "UP" ? DRAGON_VOTE_WEIGHT : -DRAGON_VOTE_WEIGHT;
          }
          // If within 24h, skip this NFT
        } else {
          // Create new NFT vote
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
      }

      // Process El Santuario NFTs - only use first one, gives 5 votes, can vote again after 24h
      if (walletNFTs.santuario.length > 0) {
        const santuarioNft = walletNFTs.santuario[0];
        const key = `${SANTUARIO_TOKEN_ID}-${santuarioNft.serialNumber}`;
        const existingNftVote = existingVoteMap.get(key);

        if (existingNftVote) {
          // Check if 24h passed since last NFT vote
          if (existingNftVote.createdAt < twentyFourHoursAgo) {
            await prisma.nftVote.update({
              where: { id: existingNftVote.id },
              data: {
                voteType: voteType as VoteType,
                createdAt: new Date(),
              },
            });
            nftVotesUsed.push({
              tokenId: SANTUARIO_TOKEN_ID,
              serialNumber: santuarioNft.serialNumber,
              weight: SANTUARIO_VOTE_WEIGHT,
            });
            nftVoteWeight += voteType === "UP" ? SANTUARIO_VOTE_WEIGHT : -SANTUARIO_VOTE_WEIGHT;
          }
        } else {
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
    }

    // Update event vote counts
    // totalVoteChange encodes a "swing": e.g. +2 means going from DOWN(-1) to UP(+1)
    // For a direction change, we must move votes between counters (decrement old, increment new)
    // For a new vote, we just increment the appropriate counter
    const totalVoteChange = regularVoteWeight + nftVoteWeight;
    if (totalVoteChange !== 0) {
      const isDirectionChange = existingVote && Math.abs(totalVoteChange) >= 2;

      if (isDirectionChange) {
        // Direction change: half the swing removes from old counter, half adds to new
        const perCounter = Math.abs(totalVoteChange) / 2;
        if (totalVoteChange > 0) {
          // DOWN -> UP: move votes from votesDown to votesUp
          await prisma.event.update({
            where: { id: eventId },
            data: {
              votesUp: { increment: perCounter },
              votesDown: { decrement: perCounter },
            },
          });
        } else {
          // UP -> DOWN: move votes from votesUp to votesDown
          await prisma.event.update({
            where: { id: eventId },
            data: {
              votesUp: { decrement: perCounter },
              votesDown: { increment: perCounter },
            },
          });
        }
      } else {
        // New vote: just add to the appropriate counter
        await prisma.event.update({
          where: { id: eventId },
          data: {
            votesUp: { increment: totalVoteChange > 0 ? Math.abs(totalVoteChange) : 0 },
            votesDown: { increment: totalVoteChange < 0 ? Math.abs(totalVoteChange) : 0 },
          },
        });
      }
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
