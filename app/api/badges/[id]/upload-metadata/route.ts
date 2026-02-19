import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBadgeMetadata, isIPFSConfigured } from "@/lib/ipfs";

// Maximum file size: 1MB for badge images
const MAX_FILE_SIZE = 1 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// POST /api/badges/[id]/upload-metadata - Upload image and create IPFS metadata
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

    if (!isIPFSConfigured()) {
      return NextResponse.json(
        { error: "IPFS not configured. Contact admin." },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Get badge and verify ownership
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

    // Get event info for metadata
    const event = await prisma.event.findUnique({
      where: { id: badge.eventId },
      select: {
        title: true,
        mintDate: true,
        location: true,
      },
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 1MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate badge name from event
    const badgeName = event?.title ? `${event.title} Badge` : badge.name;

    // Upload to IPFS and create metadata
    const result = await createBadgeMetadata({
      name: badgeName,
      description: description || badge.description || undefined,
      imageBuffer: buffer,
      imageFilename: file.name,
      imageContentType: file.type,
      eventTitle: event?.title || undefined,
      eventDate: event?.mintDate?.toISOString().split("T")[0],
      eventLocation: event?.location || undefined,
    });

    // Update badge with IPFS info
    const updated = await prisma.attendanceBadge.update({
      where: { id },
      data: {
        name: badgeName,
        description: description || badge.description,
        imageCid: result.imageCid,
        metadataCid: result.metadataCid, // HIP-412 metadata CID for minting
        // Also store gateway URL for display
        imageUrl: `https://gateway.pinata.cloud/ipfs/${result.imageCid}`,
      },
    });

    return NextResponse.json({
      success: true,
      imageCid: result.imageCid,
      metadataCid: result.metadataCid,
      metadataUri: result.metadataUri,
      imageUrl: updated.imageUrl,
      badge: updated,
    });
  } catch (error) {
    console.error("Failed to upload metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload metadata",
      },
      { status: 500 }
    );
  }
}
