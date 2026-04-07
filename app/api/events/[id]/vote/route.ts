import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
import { submitEventVoteToHCS } from "@/lib/hcs-votes";
import { reserveVoteSlot } from "@/lib/vote-limit";
import { awardReferralCommission } from "@/lib/referral-points";

// Points awarded per event vote (0 — points come from mission completion only)
const POINTS_PER_VOTE = 0;

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

    // Validate event ID format (CUID)
    if (!eventId || !/^c[a-z0-9]{24}$/.test(eventId)) {
      return NextResponse.json(
        { error: "Invalid event ID format" },
        { status: 400 }
      );
    }

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

    // Check for existing regular vote BEFORE reserving a slot
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    // For regular events: if already voted today, reject BEFORE consuming a vote slot
    const isForeverMint = event.isForeverMint;
    if (existingVote && !isForeverMint) {
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const votedToday = existingVote.createdAt >= startOfDay;

      if (votedToday && !useNftVotes) {
        const tomorrow = new Date(startOfDay);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const msRemaining = tomorrow.getTime() - now.getTime();
        const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
        return NextResponse.json(
          {
            error: `You already voted today. Resets at 00:00 UTC (${hoursRemaining}h)`,
            hoursRemaining,
          },
          { status: 429 }
        );
      }
    }

    // NOW reserve a vote slot (only if we know the vote will go through)
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

    let regularVoteWeight = 0;
    let nftVoteWeight = 0;
    let nftVotesUsed: { tokenId: string; serialNumber: number; weight: number }[] = [];

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

          // Calculate vote change for regular vote only (NFT votes handled below)
          if (voteType === "UP" && oldVoteType === "DOWN") {
            regularVoteWeight = 2; // -1 becomes +1
          } else if (voteType === "DOWN" && oldVoteType === "UP") {
            regularVoteWeight = -2; // +1 becomes -1
          }
        } else {
          // Same vote type on forever mint — update createdAt so it appears in today's history
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { createdAt: new Date() },
          });
        }
      } else {
        // Regular event: already checked same-day above, so this is a new-day re-vote
        const oldVoteType = existingVote.voteType;

        await prisma.$transaction([
          prisma.vote.update({
            where: { id: existingVote.id },
            data: {
              voteType: voteType as VoteType,
              createdAt: new Date(),
            },
          }),
          // Award points for re-votes too (same as first vote)
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

        // Award 5% referral commission (fire-and-forget)
        awardReferralCommission(user.id, POINTS_PER_VOTE, "VOTE");

        // Calculate vote change - every 24h the user can add +1 (UP) or -1 (DOWN)
        if (voteType === "UP" && oldVoteType === "DOWN") {
          regularVoteWeight = 2;
        } else if (voteType === "DOWN" && oldVoteType === "UP") {
          regularVoteWeight = -2;
        } else {
          regularVoteWeight = voteType === "UP" ? 1 : -1;
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

        // Award 5% referral commission (fire-and-forget)
        awardReferralCommission(user.id, POINTS_PER_VOTE, "VOTE");
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
      const nftNow = new Date();
      const nftStartOfDay = new Date(Date.UTC(nftNow.getUTCFullYear(), nftNow.getUTCMonth(), nftNow.getUTCDate()));

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

      // Process dragon NFTs
      for (const dragon of walletNFTs.dragons) {
        const key = `${DRAGON_TOKEN_ID}-${dragon.serialNumber}`;
        const existingNftVote = existingVoteMap.get(key);

        if (existingNftVote) {
          if (isForeverMint) {
            // Forever mint: update direction if changed, no cooldown
            if (existingNftVote.voteType !== voteType) {
              await prisma.nftVote.update({
                where: { id: existingNftVote.id },
                data: {
                  voteType: voteType as VoteType,
                  createdAt: new Date(),
                },
              });
              // Direction change: weight swings both ways
              nftVoteWeight += voteType === "UP" ? DRAGON_VOTE_WEIGHT * 2 : -DRAGON_VOTE_WEIGHT * 2;
              nftVotesUsed.push({
                tokenId: DRAGON_TOKEN_ID,
                serialNumber: dragon.serialNumber,
                weight: DRAGON_VOTE_WEIGHT,
              });
            }
            // Same direction on forever mint: no change needed
          } else {
            // Regular event: 24h cooldown
            if (existingNftVote.createdAt < nftStartOfDay) {
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
          }
        } else {
          // Create new NFT vote (works for both forever and regular)
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

      // Process El Santuario NFTs - only use first one, gives 5 votes
      if (walletNFTs.santuario.length > 0) {
        const santuarioNft = walletNFTs.santuario[0];
        const key = `${SANTUARIO_TOKEN_ID}-${santuarioNft.serialNumber}`;
        const existingNftVote = existingVoteMap.get(key);

        if (existingNftVote) {
          if (isForeverMint) {
            // Forever mint: update direction if changed, no cooldown
            if (existingNftVote.voteType !== voteType) {
              await prisma.nftVote.update({
                where: { id: existingNftVote.id },
                data: {
                  voteType: voteType as VoteType,
                  createdAt: new Date(),
                },
              });
              nftVoteWeight += voteType === "UP" ? SANTUARIO_VOTE_WEIGHT * 2 : -SANTUARIO_VOTE_WEIGHT * 2;
              nftVotesUsed.push({
                tokenId: SANTUARIO_TOKEN_ID,
                serialNumber: santuarioNft.serialNumber,
                weight: SANTUARIO_VOTE_WEIGHT,
              });
            }
          } else {
            // Regular event: 24h cooldown
            if (existingNftVote.createdAt < nftStartOfDay) {
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
        // Fetch current values to ensure balanced move (never go below 0)
        const currentEvent = await prisma.event.findUnique({
          where: { id: eventId },
          select: { votesUp: true, votesDown: true },
        });
        const curUp = Math.max(0, currentEvent?.votesUp ?? 0);
        const curDown = Math.max(0, currentEvent?.votesDown ?? 0);

        if (totalVoteChange > 0) {
          // DOWN -> UP: move votes from votesDown to votesUp
          const newDown = Math.max(0, curDown - perCounter);
          const actualRemoved = curDown - newDown;
          await prisma.event.update({
            where: { id: eventId },
            data: {
              votesUp: { increment: actualRemoved }, // Only add what we actually removed
              votesDown: { set: newDown },
            },
          });
        } else {
          // UP -> DOWN: move votes from votesUp to votesDown
          const newUp = Math.max(0, curUp - perCounter);
          const actualRemoved = curUp - newUp;
          await prisma.event.update({
            where: { id: eventId },
            data: {
              votesDown: { increment: actualRemoved }, // Only add what we actually removed
              votesUp: { set: newUp },
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

    // Submit vote to HCS (async, don't wait)
    const eventTypeMap: Record<string, "nft" | "meetup" | "hackathon"> = {
      "MINT_EVENT": "nft",
      "ECOSYSTEM_MEETUP": "meetup",
      "HACKATHON": "hackathon",
    };
    const hcsEventType = eventTypeMap[event.event_type] || "nft";

    try {
      await submitEventVoteToHCS(
        user.walletAddress,
        eventId,
        hcsEventType,
        voteType.toLowerCase() as "up" | "down"
      );
    } catch (err) {
      console.error("HCS submit failed:", err);
    }

    // Bust ISR cache so other pages show updated counts immediately
    revalidatePath("/api/events/featured");

    const finalUp = Math.max(0, updatedEvent?.votesUp ?? 0);
    const finalDown = Math.max(0, updatedEvent?.votesDown ?? 0);

    return NextResponse.json({
      success: true,
      newScore: finalUp - finalDown,
      votesUp: finalUp,
      votesDown: finalDown,
      nftVotesUsed: nftVotesUsed.length > 0 ? nftVotesUsed : undefined,
      totalNftWeight: nftVoteWeight !== 0 ? Math.abs(nftVoteWeight) : undefined,
      votesRemaining: voteSlot.remaining,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Failed to vote" },
      { status: 500 }
    );
  }
}
