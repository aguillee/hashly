import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/tokens/[tokenId] - Toggle hide/show a token
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
    const body = await request.json();
    const { isHidden } = body;

    if (typeof isHidden !== "boolean") {
      return NextResponse.json(
        { error: "isHidden must be a boolean" },
        { status: 400 }
      );
    }

    // Find the token by token address
    const token = await prisma.token.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (!token) {
      return NextResponse.json(
        { error: `Token with ID ${tokenId} not found` },
        { status: 404 }
      );
    }

    // Update the token
    const updated = await prisma.token.update({
      where: { id: token.id },
      data: { isHidden },
    });

    return NextResponse.json({
      success: true,
      token: updated,
      message: `Token "${token.symbol}" is now ${isHidden ? "hidden" : "visible"}`,
    });
  } catch (error) {
    console.error("Toggle token visibility error:", error);
    return NextResponse.json(
      { error: "Failed to update token visibility" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tokens/[tokenId] - Delete a specific token by token ID
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

    // Find the token by token address
    const token = await prisma.token.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (!token) {
      return NextResponse.json(
        { error: `Token with ID ${tokenId} not found` },
        { status: 404 }
      );
    }

    // Delete all votes for this token first
    const deletedVotes = await prisma.tokenVote.deleteMany({
      where: { tokenId: token.id },
    });

    // Delete the token
    await prisma.token.delete({
      where: { id: token.id },
    });

    return NextResponse.json({
      message: `Deleted token "${token.symbol}" (${tokenId}) and ${deletedVotes.count} votes.`,
    });
  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json(
      { error: "Failed to delete token" },
      { status: 500 }
    );
  }
}
