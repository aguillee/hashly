import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/events/with-badge - Get meetup events that have attendance badges
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const upcoming = searchParams.get("upcoming") === "true";

    // Get badges with their events
    const badges = await prisma.attendanceBadge.findMany({
      where: {
        status: { in: ["TOKEN_CREATED", "MINTED", "DISTRIBUTED"] },
      },
      select: {
        id: true,
        eventId: true,
        name: true,
        imageUrl: true,
        tokenId: true,
        status: true,
        supply: true,
      },
      take: limit * 2, // Get more to filter
    });

    if (badges.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Get events
    const eventIds = badges.map((b) => b.eventId);
    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        isApproved: true,
        event_type: "ECOSYSTEM_MEETUP",
        ...(upcoming && {
          OR: [
            { mintDate: { gte: now } },
            { endDate: { gte: now } },
          ],
        }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        mintDate: true,
        endDate: true,
        host: true,
        location: true,
        location_type: true,
        votesUp: true,
        votesDown: true,
      },
      orderBy: { mintDate: "asc" },
      take: limit,
    });

    // Combine with badge info
    const badgesMap = new Map(badges.map((b) => [b.eventId, b]));

    const eventsWithBadges = events.map((event) => ({
      ...event,
      badge: badgesMap.get(event.id) || null,
    }));

    return NextResponse.json({ events: eventsWithBadges });
  } catch (error) {
    console.error("Failed to fetch events with badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
