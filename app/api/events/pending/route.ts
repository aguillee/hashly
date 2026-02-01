import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addPoints } from "@/lib/points";
import { eventPendingActionSchema } from "@/lib/validations";

// GET /api/events/pending - List pending events (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Get pending events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending events" },
      { status: 500 }
    );
  }
}

// POST /api/events/pending - Approve or reject event (admin only)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = eventPendingActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map(e => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { eventId, action } = validation.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      await prisma.event.update({
        where: { id: eventId },
        data: { isApproved: true },
      });

      // Award points to the creator
      await addPoints(
        event.createdById,
        "EVENT_APPROVED",
        `Event approved: ${event.title}`
      );

      return NextResponse.json({
        success: true,
        message: "Event approved",
      });
    } else {
      // Delete rejected event
      await prisma.event.delete({
        where: { id: eventId },
      });

      return NextResponse.json({
        success: true,
        message: "Event rejected and deleted",
      });
    }
  } catch (error) {
    console.error("Approve/reject event error:", error);
    return NextResponse.json(
      { error: "Failed to process event" },
      { status: 500 }
    );
  }
}
