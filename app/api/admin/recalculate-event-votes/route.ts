import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/admin/recalculate-event-votes - Recalculate all event votesUp/votesDown from actual votes
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all events
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        votesUp: true,
        votesDown: true,
      },
    });

    let updated = 0;
    const changes: { id: string; title: string; old: { up: number; down: number }; new: { up: number; down: number } }[] = [];

    for (const event of events) {
      // Count regular votes
      const regularVotes = await prisma.vote.groupBy({
        by: ["voteType"],
        where: { eventId: event.id },
        _count: true,
      });

      // Count NFT votes with their weights
      const nftVotes = await prisma.nftVote.groupBy({
        by: ["voteType"],
        where: { eventId: event.id },
        _sum: { voteWeight: true },
      });

      // Calculate totals
      let votesUp = 0;
      let votesDown = 0;

      // Add regular votes (1 each)
      for (const v of regularVotes) {
        if (v.voteType === "UP") votesUp += v._count;
        else if (v.voteType === "DOWN") votesDown += v._count;
      }

      // Add NFT votes (weighted)
      for (const v of nftVotes) {
        const weight = v._sum.voteWeight || 0;
        if (v.voteType === "UP") votesUp += weight;
        else if (v.voteType === "DOWN") votesDown += weight;
      }

      // Update if different
      if (event.votesUp !== votesUp || event.votesDown !== votesDown) {
        await prisma.event.update({
          where: { id: event.id },
          data: { votesUp, votesDown },
        });

        changes.push({
          id: event.id,
          title: event.title,
          old: { up: event.votesUp, down: event.votesDown },
          new: { up: votesUp, down: votesDown },
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      totalEvents: events.length,
      updated,
      changes: changes.slice(0, 20), // Show first 20 changes
      message: `Recalculated ${updated} events`,
    });
  } catch (error) {
    console.error("Recalculate event votes error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate votes" },
      { status: 500 }
    );
  }
}

// GET /api/admin/recalculate-event-votes - Preview which events have mismatched votes
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get sample of events to check
    const events = await prisma.event.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        votesUp: true,
        votesDown: true,
      },
    });

    const mismatches: { id: string; title: string; stored: { up: number; down: number }; calculated: { up: number; down: number } }[] = [];

    for (const event of events) {
      // Count regular votes
      const regularVotes = await prisma.vote.groupBy({
        by: ["voteType"],
        where: { eventId: event.id },
        _count: true,
      });

      // Count NFT votes
      const nftVotes = await prisma.nftVote.groupBy({
        by: ["voteType"],
        where: { eventId: event.id },
        _sum: { voteWeight: true },
      });

      let votesUp = 0;
      let votesDown = 0;

      for (const v of regularVotes) {
        if (v.voteType === "UP") votesUp += v._count;
        else if (v.voteType === "DOWN") votesDown += v._count;
      }

      for (const v of nftVotes) {
        const weight = v._sum.voteWeight || 0;
        if (v.voteType === "UP") votesUp += weight;
        else if (v.voteType === "DOWN") votesDown += weight;
      }

      if (event.votesUp !== votesUp || event.votesDown !== votesDown) {
        mismatches.push({
          id: event.id,
          title: event.title,
          stored: { up: event.votesUp, down: event.votesDown },
          calculated: { up: votesUp, down: votesDown },
        });
      }
    }

    return NextResponse.json({
      checked: events.length,
      mismatches: mismatches.length,
      examples: mismatches.slice(0, 10),
      message: mismatches.length > 0
        ? `Found ${mismatches.length} events with mismatched votes. Run POST to fix.`
        : "All checked events have correct vote counts.",
    });
  } catch (error) {
    console.error("Check event votes error:", error);
    return NextResponse.json(
      { error: "Failed to check votes" },
      { status: 500 }
    );
  }
}
