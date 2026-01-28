import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addPoints } from "@/lib/points";

// GET /api/events/pending - List pending events (admin only)
export async function GET() {
  try {
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
    const user = await getCurrentUser();

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { eventId, action } = await request.json();

    if (!eventId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

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
