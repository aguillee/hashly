import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/checkin/[eventId]/attendees — List checked-in wallets
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

    // Check badge exists and verify host access
    const badge = await prisma.attendanceBadge.findUnique({
      where: { eventId },
      select: { hostWallet: true },
    });

    if (!badge) {
      return NextResponse.json({ error: "No badge for this event" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const checkins = await prisma.eventCheckin.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      select: {
        walletAddress: true,
        createdAt: true,
        hcsMessageId: true,
      },
    });

    return NextResponse.json({
      attendees: checkins,
      total: checkins.length,
    });
  } catch (error) {
    console.error("Failed to fetch attendees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
