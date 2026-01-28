import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/events/featured - Get featured events (most voted + next up)
export async function GET() {
  try {
    const now = new Date();

    // Get all approved upcoming/live events
    const events = await prisma.event.findMany({
      where: {
        isApproved: true,
        status: { in: ["UPCOMING", "LIVE"] },
      },
      include: {
        createdBy: {
          select: { walletAddress: true },
        },
        phases: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Calculate score and find most voted
    let mostVoted = null;
    let highestScore = -Infinity;

    for (const event of events) {
      const score = event.votesUp - event.votesDown;
      if (score > highestScore) {
        highestScore = score;
        mostVoted = event;
      }
    }

    // Find next up (closest mint date in the future)
    // Only consider events with a mint date (not TBA)
    const upcomingEvents = events
      .filter((e) => e.mintDate && new Date(e.mintDate) > now)
      .sort((a, b) => new Date(a.mintDate!).getTime() - new Date(b.mintDate!).getTime());

    // Make sure nextUp is different from mostVoted if possible
    let nextUp = upcomingEvents[0] || null;
    if (nextUp && mostVoted && nextUp.id === mostVoted.id && upcomingEvents.length > 1) {
      nextUp = upcomingEvents[1];
    }

    return NextResponse.json({
      mostVoted: mostVoted
        ? {
            ...mostVoted,
            score: mostVoted.votesUp - mostVoted.votesDown,
          }
        : null,
      nextUp: nextUp
        ? {
            ...nextUp,
            score: nextUp.votesUp - nextUp.votesDown,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch featured events:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured events" },
      { status: 500 }
    );
  }
}
