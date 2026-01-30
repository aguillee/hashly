import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE /api/admin/collections/[tokenId] - Delete a specific collection by token ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { tokenId } = params;

    // Find the collection by token address
    const collection = await prisma.collection.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: `Collection with token ID ${tokenId} not found` },
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
