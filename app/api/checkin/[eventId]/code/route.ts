import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateCheckinCode } from "@/lib/checkin";

export const dynamic = "force-dynamic";

// GET /api/checkin/[eventId]/code — Generate QR code for badge host
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    // Find event with its badge
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        event_type: true,
        _count: { select: { checkins: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check badge exists for this event
    const badge = await prisma.attendanceBadge.findUnique({
      where: { eventId },
      select: { id: true, hostWallet: true, status: true },
    });

    if (!badge) {
      return NextResponse.json(
        { error: "This event does not have an attendance badge" },
        { status: 404 }
      );
    }

    // Only badge host or admin can access
    if (badge.hostWallet !== user.walletAddress && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { code, expiresAt } = generateCheckinCode(eventId);

    return NextResponse.json({
      code,
      expiresAt,
      eventTitle: event.title,
      eventType: event.event_type,
      attendeeCount: event._count.checkins,
      badgeId: badge.id,
      badgeStatus: badge.status,
    });
  } catch (error) {
    console.error("Failed to generate check-in code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
