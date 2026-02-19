import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";

// GET /api/events/[id]/badge-status - Get badge status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Check if event exists and is a meetup
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        event_type: true,
        isApproved: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only meetups can have badges
    if (event.event_type !== "ECOSYSTEM_MEETUP") {
      return NextResponse.json({
        hasBadge: false,
        canRequestHost: false,
        badge: null,
        hostRequest: null,
      });
    }

    // Get badge if exists
    const badge = await prisma.attendanceBadge.findUnique({
      where: { eventId: id },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        tokenId: true,
        status: true,
        supply: true,
        hostWallet: true,
      },
    });

    // Get current user's host request if authenticated
    const user = await getCurrentUser();
    let userHostRequest = null;
    let canRequestHost = false;

    if (user) {
      userHostRequest = await prisma.hostRequest.findUnique({
        where: {
          walletAddress_eventId: {
            walletAddress: user.walletAddress,
            eventId: id,
          },
        },
      });

      // Can request if: no badge yet, no approved host, user hasn't requested yet
      if (!badge) {
        const approvedHost = await prisma.hostRequest.findFirst({
          where: {
            eventId: id,
            status: "APPROVED",
          },
        });
        canRequestHost = !approvedHost && !userHostRequest;
      }
    }

    return NextResponse.json({
      hasBadge: !!badge,
      canRequestHost,
      badge: badge
        ? {
            id: badge.id,
            name: badge.name,
            imageUrl: badge.imageUrl,
            tokenId: badge.tokenId,
            status: badge.status,
            supply: badge.supply,
            isHost: user ? badge.hostWallet === user.walletAddress : false,
          }
        : null,
      hostRequest: userHostRequest
        ? {
            id: userHostRequest.id,
            status: userHostRequest.status,
            createdAt: userHostRequest.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to get badge status:", error);
    return NextResponse.json(
      { error: "Failed to get badge status" },
      { status: 500 }
    );
  }
}
