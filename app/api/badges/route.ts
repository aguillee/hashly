import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/badges - Get user's hosted badges
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const badges = await prisma.attendanceBadge.findMany({
      where: { hostWallet: user.walletAddress },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { claims: true },
        },
      },
    });

    // Get event details
    const eventIds = badges.map((b) => b.eventId);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        mintDate: true,
        endDate: true,
        event_type: true,
        host: true,
        location: true,
        location_type: true,
      },
    });
    const eventsMap = new Map(events.map((e) => [e.id, e]));

    const badgesWithEvents = badges.map((b) => ({
      ...b,
      event: eventsMap.get(b.eventId),
      claimsCount: b._count.claims,
    }));

    return NextResponse.json({ badges: badgesWithEvents });
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
