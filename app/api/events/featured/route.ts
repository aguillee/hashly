import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/events/featured - Get featured events (most voted + next up + top forever mint)
export async function GET() {
  try {
    const now = new Date();

    // Get all approved upcoming/live events (excluding forever mints for main featured)
    const events = await prisma.event.findMany({
      where: {
        isApproved: true,
        status: { in: ["UPCOMING", "LIVE"] },
        isForeverMint: false, // Exclude forever mints from main featured
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

    // Get top forever mint separately
    const topForeverMint = await prisma.event.findFirst({
      where: {
        isApproved: true,
        isForeverMint: true,
      },
      orderBy: [
        { votesUp: "desc" },
      ],
      include: {
        createdBy: {
          select: { walletAddress: true },
        },
      },
    });

    // Calculate score and find most voted (excluding forever mints)
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
    // Only consider events with a mint date (not TBA) and exclude forever mints
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
      topForeverMint: topForeverMint
        ? {
            ...topForeverMint,
            score: topForeverMint.votesUp - topForeverMint.votesDown,
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
// Deploy trigger 1769637078
// Deploy trigger 1769637225
