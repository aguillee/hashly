import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const registerTokenSchema = z.object({
  tokenId: z.string().regex(/^0\.0\.\d+$/, "Invalid token ID format"),
  transactionId: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/badges/[id]/register-token - Register token created via wallet
export async function POST(
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

    const validation = registerTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const { tokenId, transactionId, name, description } = validation.data;

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (badge.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Token already registered" },
        { status: 400 }
      );
    }

    // Get event for badge name
    const event = await prisma.event.findUnique({
      where: { id: badge.eventId },
      select: { title: true },
    });

    // Badge name is auto-generated from event title
    const badgeName = event?.title ? `${event.title} Badge` : badge.name;

    // Update badge with token info from wallet transaction
    const updated = await prisma.attendanceBadge.update({
      where: { id },
      data: {
        tokenId,
        name: badgeName,
        description: description || badge.description,
        status: "TOKEN_CREATED",
      },
    });

    return NextResponse.json({
      success: true,
      tokenId,
      transactionId,
      badge: updated,
    });
  } catch (error) {
    console.error("Failed to register token:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register token",
      },
      { status: 500 }
    );
  }
}
