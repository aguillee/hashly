import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/collections/pending - Get pending collections
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const pendingCollections = await prisma.collection.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tokenAddress: true,
        name: true,
        description: true,
        image: true,
        supply: true,
        submittedBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      collections: pendingCollections,
      count: pendingCollections.length,
    });
  } catch (error) {
    console.error("Get pending collections error:", error);
    return NextResponse.json(
      { error: "Failed to get pending collections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/collections/pending - Approve or reject a collection
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { collectionId, action } = body;

    if (!collectionId || !action) {
      return NextResponse.json(
        { error: "collectionId and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the collection
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (collection.isApproved) {
      return NextResponse.json(
        { error: "Collection is already approved" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Approve the collection
      await prisma.collection.update({
        where: { id: collectionId },
        data: { isApproved: true },
      });

      return NextResponse.json({
        success: true,
        message: `Collection "${collection.name}" has been approved`,
      });
    } else {
      // Reject - delete the collection
      // First delete any votes
      await prisma.collectionVote.deleteMany({
        where: { collectionId },
      });

      // Then delete the collection
      await prisma.collection.delete({
        where: { id: collectionId },
      });

      return NextResponse.json({
        success: true,
        message: `Collection "${collection.name}" has been rejected and removed`,
      });
    }
  } catch (error) {
    console.error("Handle pending collection error:", error);
    return NextResponse.json(
      { error: "Failed to process collection" },
      { status: 500 }
    );
  }
}
