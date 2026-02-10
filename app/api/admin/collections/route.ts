import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchTokenFromMirrorNode, fetchCollectionStats } from "@/lib/sentx";
import { adminAddCollectionSchema } from "@/lib/validations";

/**
 * POST /api/admin/collections - Add a collection manually by tokenId
 * Fetches data from Hedera Mirror Node and optionally SentX
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = adminAddCollectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map(e => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { tokenId, name: customName, description: customDescription } = validation.data;

    // Check if collection already exists
    const existing = await prisma.collection.findUnique({
      where: { tokenAddress: tokenId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Collection already exists", collection: existing },
        { status: 409 }
      );
    }

    // Fetch token info from Hedera Mirror Node
    const hederaInfo = await fetchTokenFromMirrorNode(tokenId);

    if (!hederaInfo) {
      return NextResponse.json(
        { error: "Token not found on Hedera network" },
        { status: 404 }
      );
    }

    // Check if it's an NFT
    if (hederaInfo.type !== "NON_FUNGIBLE_UNIQUE") {
      return NextResponse.json(
        { error: "Token is not an NFT collection" },
        { status: 400 }
      );
    }

    // Try to get additional stats from SentX (optional)
    const sentxStats = await fetchCollectionStats(tokenId);

    // Prepare collection data
    const collectionData = {
      tokenAddress: tokenId,
      name: customName || sentxStats?.name || hederaInfo.name || tokenId,
      description: customDescription || sentxStats?.description || null,
      image: sentxStats?.image || null,
      slug: sentxStats?.slug || tokenId,
      floor: Math.round(sentxStats?.floor || 0),
      volume: Math.round(sentxStats?.volumetotal || sentxStats?.volume || 0),
      owners: sentxStats?.owners || 0,
      supply: parseInt(hederaInfo.total_supply) || sentxStats?.supply || 0,
      sentxStars: sentxStats?.stars || 0,
      source: "SENTX" as const, // Default source
      lastSyncedAt: new Date(),
    };

    // Create collection
    const collection = await prisma.collection.create({
      data: collectionData,
    });

    return NextResponse.json({
      success: true,
      collection,
      message: `Collection "${collection.name}" added successfully`,
    });
  } catch (error) {
    console.error("Add collection error:", error);
    return NextResponse.json(
      { error: "Failed to add collection" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/collections - Get all collections with admin info
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    // Limit search to 100 chars to prevent ReDoS attacks
    const rawSearch = searchParams.get("search");
    const search = rawSearch ? rawSearch.slice(0, 100) : null;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { tokenAddress: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Get collections with pagination
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          tokenAddress: true,
          name: true,
          description: true,
          image: true,
          floor: true,
          volume: true,
          owners: true,
          supply: true,
          totalVotes: true,
          source: true,
          isApproved: true,
          isHidden: true,
          lastSyncedAt: true,
          createdAt: true,
        },
      }),
      prisma.collection.count({ where }),
    ]);

    return NextResponse.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin collections error:", error);
    return NextResponse.json(
      { error: "Failed to get collections" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/collections - Delete a specific collection
 */
export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "admin");
    if (rateLimitResponse) return rateLimitResponse;
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const tokenId = searchParams.get("tokenId");

    if (!id && !tokenId) {
      return NextResponse.json(
        { error: "id or tokenId is required" },
        { status: 400 }
      );
    }

    // Find collection
    const collection = await prisma.collection.findFirst({
      where: id ? { id } : { tokenAddress: tokenId! },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Delete votes first
    await prisma.collectionVote.deleteMany({
      where: { collectionId: collection.id },
    });

    // Delete collection
    await prisma.collection.delete({
      where: { id: collection.id },
    });

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.name}" deleted`,
    });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
