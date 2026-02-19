import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/badges/[id] - Get badge details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
      include: {
        claims: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Only host can see full details
    if (badge.hostWallet !== user.walletAddress && !user.isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: badge.eventId },
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

    return NextResponse.json({
      badge: {
        ...badge,
        event,
      },
    });
  } catch (error) {
    console.error("Failed to fetch badge:", error);
    return NextResponse.json(
      { error: "Failed to fetch badge" },
      { status: 500 }
    );
  }
}

// PATCH /api/badges/[id] - Update badge (name, description, image)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, imageUrl, imageCid } = body;

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Can only update in DRAFT status
    if (badge.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot update badge after token is created" },
        { status: 400 }
      );
    }

    const updated = await prisma.attendanceBadge.update({
      where: { id },
      data: {
        name: name?.slice(0, 100),
        description: description?.slice(0, 500),
        imageUrl,
        imageCid,
      },
    });

    return NextResponse.json({ badge: updated });
  } catch (error) {
    console.error("Failed to update badge:", error);
    return NextResponse.json(
      { error: "Failed to update badge" },
      { status: 500 }
    );
  }
}
