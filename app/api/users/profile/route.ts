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

    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress as string },
      include: {
        votes: true,
        events: true,
        pointHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user rank
    const usersAbove = await prisma.user.count({
      where: {
        points: {
          gt: user.points,
        },
      },
    });

    const totalUsers = await prisma.user.count();

    const season = getCurrentSeason();

    const stats = {
      totalVotes: user.votes.length,
      totalEvents: user.events.length,
      approvedEvents: user.events.filter(e => e.isApproved).length,
      rank: usersAbove + 1,
      totalUsers,
      pointHistory: user.pointHistory,
      createdEvents: user.events
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(e => ({
          id: e.id,
          title: e.title,
          event_type: e.event_type,
          status: e.status,
          isApproved: e.isApproved,
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
