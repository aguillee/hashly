import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getCurrentSeason } from "@/lib/seasons";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const walletAddress = payload.walletAddress as string;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        pointHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const season = getCurrentSeason();
    const seasonStart = season.startDate;

    // Season-scoped queries in parallel
    const [
      seasonVoteActions,
      seasonApprovedEvents,
      seasonRank,
      seasonContributors,
      createdEvents,
    ] = await Promise.all([
      // Total vote actions this season (all types)
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "VOTE",
          createdAt: { gte: seasonStart },
        },
      }),
      // Approved events this season
      prisma.event.count({
        where: { createdById: user.id, isApproved: true, createdAt: { gte: seasonStart } },
      }),
      // Season rank — based on totalPoints (points + badgePoints + referralPoints)
      prisma.user.count({
        where: {
          points: { gt: user.points },
        },
      }),
      // Total users with any points this season
      prisma.user.count({
        where: { points: { gt: 0 } },
      }),
      // All created events (for the events list section)
      prisma.event.findMany({
        where: { createdById: user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const stats = {
      totalVotes: seasonVoteActions,
      totalEvents: createdEvents.length,
      approvedEvents: seasonApprovedEvents,
      rank: seasonRank + 1,
      totalUsers: seasonContributors,
      pointHistory: user.pointHistory,
      createdEvents: createdEvents.map(e => ({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        status: e.status,
        isApproved: e.isApproved,
        rejectedAt: e.rejectedAt?.toISOString() || null,
        mintDate: e.mintDate?.toISOString() || null,
        votesUp: e.votesUp,
        votesDown: e.votesDown,
        imageUrl: e.imageUrl,
      })),
      season: {
        number: season.number,
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate.toISOString(),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
