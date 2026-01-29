import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/admin/cleanup - Delete all non-forever-mint events
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Delete all events that are NOT forever mints
    const deleted = await prisma.event.deleteMany({
      where: {
        isForeverMint: false,
      },
    });

    return NextResponse.json({
      deleted: deleted.count,
      message: `Deleted ${deleted.count} non-forever-mint events. Forever mints preserved.`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup events" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/cleanup - Delete ALL events (including forever mints)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Delete ALL events including forever mints
    const deleted = await prisma.event.deleteMany({});

    return NextResponse.json({
      deleted: deleted.count,
      message: `Deleted ALL ${deleted.count} events (including forever mints).`,
    });
  } catch (error) {
    console.error("Delete all events error:", error);
    return NextResponse.json(
      { error: "Failed to delete all events", details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/admin/cleanup - Preview what will be deleted
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Count events by type
    const totalEvents = await prisma.event.count();
    const foreverMints = await prisma.event.count({
      where: { isForeverMint: true },
    });
    const regularEvents = await prisma.event.count({
      where: { isForeverMint: false },
    });

    return NextResponse.json({
      total: totalEvents,
      foreverMints,
      toDelete: regularEvents,
      message: `Will delete ${regularEvents} regular events. ${foreverMints} forever mints will be preserved.`,
    });
  } catch (error) {
    console.error("Cleanup preview error:", error);
    return NextResponse.json(
      { error: "Failed to get cleanup preview" },
      { status: 500 }
    );
  }
}
