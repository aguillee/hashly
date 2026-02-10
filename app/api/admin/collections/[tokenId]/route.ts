import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/collections/[tokenId] - Toggle hide/show a collection
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { tokenId } = params;

    // Validate token ID format (0.0.xxxxx)
    if (!tokenId || !/^0\.0\.\d+$/.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid token ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isHidden } = body;

    if (typeof isHidden !== "boolean") {
      return NextResponse.json(
        { error: "isHidden must be a boolean" },
        { status: 400 }
      );
    }

    // Find the collection by token address
    const collection = await prisma.collection.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Update the collection
    const updated = await prisma.collection.update({
      where: { id: collection.id },
      data: { isHidden },
    });

    return NextResponse.json({
      success: true,
      collection: updated,
      message: `Collection "${collection.name}" is now ${isHidden ? "hidden" : "visible"}`,
    });
  } catch (error) {
    console.error("Toggle collection visibility error:", error);
    return NextResponse.json(
      { error: "Failed to update collection visibility" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/collections/[tokenId] - Delete a specific collection by token ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { tokenId } = params;

    // Validate token ID format (0.0.xxxxx)
    if (!tokenId || !/^0\.0\.\d+$/.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid token ID format" },
        { status: 400 }
      );
    }

    // Find the collection by token address
    const collection = await prisma.collection.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Delete all votes for this collection first (foreign key constraint)
    const deletedVotes = await prisma.collectionVote.deleteMany({
      where: { collectionId: collection.id },
    });

    // Delete the collection
    await prisma.collection.delete({
      where: { id: collection.id },
    });

    return NextResponse.json({
      message: `Deleted collection "${collection.name}" (${tokenId}) and ${deletedVotes.count} votes.`,
    });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
