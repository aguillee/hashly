import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/v1/events/{id} — single event by id.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, isApproved: true },
      select: {
        id: true,
        title: true,
        description: true,
        mintDate: true,
        endDate: true,
        mintPrice: true,
        supply: true,
        imageUrl: true,
        websiteUrl: true,
        twitterUrl: true,
        discordUrl: true,
        status: true,
        isForeverMint: true,
        source: true,
        event_type: true,
        host: true,
        location: true,
        location_type: true,
        custom_links: true,
        prizes: true,
        votesUp: true,
        votesDown: true,
        createdAt: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...event,
      mintDate: event.mintDate?.toISOString() || null,
      endDate: event.endDate?.toISOString() || null,
      createdAt: event.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[v1/events/:id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
