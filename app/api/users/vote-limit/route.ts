import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVoteLimitInfo } from "@/lib/vote-limit";
import { prisma } from "@/lib/db";

// Get start of current UTC day
function getUTCDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const limitInfo = await getVoteLimitInfo(user.walletAddress);

    // Only fetch history if user has used votes today
    if (limitInfo.used === 0) {
      return NextResponse.json({
        ...limitInfo,
        history: [],
      });
    }

    const todayStart = getUTCDayStart();

    // Get today's votes from all sources
    const [eventVotes, collectionVotes, tokenVotes] = await Promise.all([
      // Event votes (forever mints) - check createdAt for today
      prisma.vote.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: todayStart },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              event_type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Collection votes - check updatedAt for today (they can be updated)
      prisma.collectionVote.findMany({
        where: {
          walletAddress: user.walletAddress,
          updatedAt: { gte: todayStart },
        },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      // Token votes - check updatedAt for today
      prisma.tokenVote.findMany({
        where: {
          walletAddress: user.walletAddress,
          updatedAt: { gte: todayStart },
        },
        include: {
          token: {
            select: {
              id: true,
              name: true,
              symbol: true,
              icon: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Combine and format vote history
    const history = [
      ...eventVotes.map((v) => ({
        type: "event" as const,
        id: v.event.id,
        name: v.event.title,
        imageUrl: v.event.imageUrl,
        eventType: v.event.event_type,
        voteType: v.voteType,
        timestamp: v.createdAt.toISOString(),
      })),
      ...collectionVotes.map((v) => ({
        type: "collection" as const,
        id: v.collection.id,
        name: v.collection.name,
        imageUrl: v.collection.image,
        voteWeight: v.voteWeight,
        timestamp: v.updatedAt.toISOString(),
      })),
      ...tokenVotes.map((v) => ({
        type: "token" as const,
        id: v.token.id,
        name: v.token.name,
        symbol: v.token.symbol,
        imageUrl: v.token.icon,
        voteWeight: v.voteWeight,
        timestamp: v.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5); // Only show last 5 votes

    return NextResponse.json({
      ...limitInfo,
      history,
    });
  } catch (error) {
    console.error("Get vote limit error:", error);
    return NextResponse.json(
      { error: "Failed to get vote limit" },
      { status: 500 }
    );
  }
}
