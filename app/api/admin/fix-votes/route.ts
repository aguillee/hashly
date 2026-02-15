import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/admin/fix-votes
 * Fix events with negative votesDown values (convert to positive)
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Find all events with negative votesDown
    const eventsWithNegativeVotes = await prisma.event.findMany({
      where: {
        votesDown: { lt: 0 },
      },
      select: {
        id: true,
        title: true,
        votesUp: true,
        votesDown: true,
      },
    });

    console.log(`Found ${eventsWithNegativeVotes.length} events with negative votesDown`);

    // Fix each event
    const fixed: { id: string; title: string; oldVotesDown: number; newVotesDown: number }[] = [];

    for (const event of eventsWithNegativeVotes) {
      const newVotesDown = Math.abs(event.votesDown);

      await prisma.event.update({
        where: { id: event.id },
        data: { votesDown: newVotesDown },
      });

      fixed.push({
        id: event.id,
        title: event.title,
        oldVotesDown: event.votesDown,
        newVotesDown,
      });

      console.log(`Fixed: ${event.title} - votesDown: ${event.votesDown} -> ${newVotesDown}`);
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} events with negative votesDown`,
      fixed,
    });
  } catch (error) {
    console.error("Fix votes error:", error);
    return NextResponse.json(
      { error: "Failed to fix votes" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fix-votes
 * Preview events with negative votesDown (dry run)
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Find all events with negative votesDown
    const eventsWithNegativeVotes = await prisma.event.findMany({
      where: {
        votesDown: { lt: 0 },
      },
      select: {
        id: true,
        title: true,
        votesUp: true,
        votesDown: true,
      },
    });

    return NextResponse.json({
      count: eventsWithNegativeVotes.length,
      events: eventsWithNegativeVotes.map((e) => ({
        ...e,
        currentScore: e.votesUp - e.votesDown,
        correctedScore: e.votesUp - Math.abs(e.votesDown),
      })),
    });
  } catch (error) {
    console.error("Preview fix votes error:", error);
    return NextResponse.json(
      { error: "Failed to preview" },
      { status: 500 }
    );
  }
}
