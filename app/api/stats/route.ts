import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // Revalidate every 24 hours

// GET /api/stats - Get homepage statistics
export async function GET() {
  try {
    // Run all counts in parallel for performance
    const [eventsCount, collectionsCount, totalVotes] = await Promise.all([
      // Count approved events
      prisma.event.count({
        where: { isApproved: true },
      }),
      // Count approved collections
      prisma.collection.count({
        where: { isApproved: true },
      }),
      // Sum all votes (votesUp from events + totalVotes from collections + totalVotes from tokens)
      prisma.$transaction(async (tx) => {
        const eventVotes = await tx.event.aggregate({
          where: { isApproved: true },
          _sum: { votesUp: true },
        });
        const collectionVotes = await tx.collection.aggregate({
          where: { isApproved: true },
          _sum: { totalVotes: true },
        });
        const tokenVotes = await tx.token.aggregate({
          where: { isApproved: true },
          _sum: { totalVotes: true },
        });
        return (
          (eventVotes._sum.votesUp || 0) +
          (collectionVotes._sum.totalVotes || 0) +
          (tokenVotes._sum.totalVotes || 0)
        );
      }),
    ]);

    return NextResponse.json({
      events: eventsCount,
      collections: collectionsCount,
      votes: totalVotes,
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
