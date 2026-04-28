import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";
import { Prisma, EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/v1/events — public read-only listing of approved events.
// Mirrors the shape used by the internal /api/events but without the
// session-scoped fields (userVote, canVote, etc.) since this surface is
// API-key authenticated, not user-session authenticated.
export async function GET(request: NextRequest) {
  // 1. Rate limit (existing public bucket — generous enough for API consumers).
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  // 2. API key gate.
  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const eventType = searchParams.get("eventType");
    const source = searchParams.get("source");
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);

    const where: Prisma.EventWhereInput = { isApproved: true };

    if (status && status !== "all") {
      const validStatuses: EventStatus[] = ["UPCOMING", "LIVE", "ENDED"];
      const upper = status.toUpperCase() as EventStatus;
      if (!validStatuses.includes(upper)) {
        return NextResponse.json(
          { error: "Invalid status", code: "INTERNAL" },
          { status: 400 }
        );
      }
      where.status = upper;
    } else {
      // Default: hide ENDED events from the API just like the public web does.
      where.status = { not: "ENDED" };
    }

    if (eventType === "MINT_EVENT" || eventType === "ECOSYSTEM_MEETUP" || eventType === "HACKATHON") {
      where.event_type = eventType;
    }

    if (source === "SENTX" || source === "KABILA") {
      where.source = source;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { mintDate: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          description: true,
          mintDate: true,
          endDate: true,
          mintPrice: true,
          supply: true,
          imageUrl: true,
          status: true,
          isForeverMint: true,
          source: true,
          event_type: true,
          host: true,
          location: true,
          location_type: true,
          votesUp: true,
          votesDown: true,
          createdAt: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        mintDate: e.mintDate?.toISOString() || null,
        endDate: e.endDate?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      hasMore: offset + events.length < total,
    });
  } catch (error) {
    console.error("[v1/events] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
