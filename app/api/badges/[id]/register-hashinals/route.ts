import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/badges/[id]/register-hashinals
// Register HCS-1 topic IDs for image and metadata after on-chain inscription
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
        { error: "Cannot modify badge after token creation" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageTopicId, metadataTopicId, metadataUri, name } = body;

    if (!imageTopicId || !metadataTopicId) {
      return NextResponse.json(
        { error: "imageTopicId and metadataTopicId are required" },
        { status: 400 }
      );
    }

    // Validate topic ID format (0.0.XXXXX)
    const topicIdRegex = /^0\.0\.\d+$/;
    if (!topicIdRegex.test(imageTopicId) || !topicIdRegex.test(metadataTopicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID format" },
        { status: 400 }
      );
    }

    const updated = await prisma.attendanceBadge.update({
      where: { id },
      data: {
        name: name || badge.name,
        imageTopicId,
        metadataTopicId,
        // Clear legacy IPFS fields
        imageCid: null,
        metadataCid: null,
      },
    });

    return NextResponse.json({
      success: true,
      imageTopicId: updated.imageTopicId,
      metadataTopicId: updated.metadataTopicId,
      metadataUri: metadataUri || `hcs://1/${metadataTopicId}`,
      badge: updated,
    });
  } catch (error) {
    console.error("Failed to register hashinals metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to register hashinals metadata",
      },
      { status: 500 }
    );
  }
}
