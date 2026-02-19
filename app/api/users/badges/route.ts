import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkNFTOwnership } from "@/lib/hedera-nft";

interface UserBadge {
  badgeId: string;
  tokenId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  serials: number[];
  event: {
    id: string;
    title: string;
    mintDate: string | null;
    imageUrl: string | null;
  } | null;
}

// GET /api/users/badges - Get attendance badges owned by the user
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all badges that have been minted (have a tokenId)
    const badges = await prisma.attendanceBadge.findMany({
      where: {
        tokenId: { not: null },
        status: { in: ["MINTED", "DISTRIBUTED"] },
      },
      select: {
        id: true,
        tokenId: true,
        name: true,
        description: true,
        imageUrl: true,
        eventId: true,
      },
    });

    if (badges.length === 0) {
      return NextResponse.json({ badges: [], count: 0 });
    }

    // Get events for these badges
    const eventIds = badges.map((b) => b.eventId);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        mintDate: true,
        imageUrl: true,
      },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Check which badges the user owns via Mirror Node
    const userBadges: UserBadge[] = [];

    for (const badge of badges) {
      if (!badge.tokenId) continue;

      const ownership = await checkNFTOwnership(
        badge.tokenId,
        user.walletAddress
      );

      if (ownership.owns) {
        const event = eventMap.get(badge.eventId);
        userBadges.push({
          badgeId: badge.id,
          tokenId: badge.tokenId,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          serials: ownership.serials,
          event: event
            ? {
                id: event.id,
                title: event.title,
                mintDate: event.mintDate?.toISOString() || null,
                imageUrl: event.imageUrl,
              }
            : null,
        });
      }
    }

    return NextResponse.json({
      badges: userBadges,
      count: userBadges.length,
    });
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
