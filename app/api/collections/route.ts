import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchCollectionsBatch, resolveImageUrl } from "@/lib/sentx";

// GET /api/collections - List collections with rankings
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "votes";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const syncFromSentX = searchParams.get("sync") === "true";

    // Optionally sync from SentX (called less frequently)
    if (syncFromSentX) {
      await syncCollectionsFromSentX();
    }

    // Build where clause
    const where: any = {};

    if (search) {
      // When searching, search ALL collections (including those with 0 votes)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    } else {
      // When not searching, only show collections with votes (positive or negative)
      where.NOT = { totalVotes: 0 };
    }

    // Build orderBy
    let orderBy: any = { totalVotes: "desc" };

    if (sortBy === "floor") {
      orderBy = { floor: "desc" };
    } else if (sortBy === "volume") {
      orderBy = { volume: "desc" };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "stars") {
      orderBy = { sentxStars: "desc" };
    }

    // Fetch collections
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          tokenAddress: true,
          name: true,
          description: true,
          image: true,
          slug: true,
          floor: true,
          volume: true,
          owners: true,
          supply: true,
          totalVotes: true,
          sentxStars: true,
          lastSyncedAt: true,
          createdAt: true,
        },
      }),
      prisma.collection.count({ where }),
    ]);

    // Get user votes if authenticated
    const user = await getCurrentUser();
    let userVotesMap: Record<string, { voteWeight: number; nftTokenId?: string }> = {};

    if (user) {
      const userVotes = await prisma.collectionVote.findMany({
        where: {
          walletAddress: user.walletAddress,
          collectionId: { in: collections.map((c) => c.id) },
        },
        select: {
          collectionId: true,
          voteWeight: true,
          nftTokenId: true,
        },
      });

      userVotesMap = userVotes.reduce((acc, v) => {
        acc[v.collectionId] = {
          voteWeight: v.voteWeight,
          nftTokenId: v.nftTokenId || undefined,
        };
        return acc;
      }, {} as Record<string, { voteWeight: number; nftTokenId?: string }>);
    }

    return NextResponse.json({
      collections: collections.map((c, index) => ({
        ...c,
        rank: offset + index + 1,
        image: resolveImageUrl(c.image || ""),
        userVote: userVotesMap[c.id] || null,
        lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      hasMore: offset + collections.length < total,
    });
  } catch (error) {
    console.error("Get collections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections/sync - Sync collections from SentX
export async function POST(request: NextRequest) {
  // Rate limiting - stricter for sync operations
  const rateLimitResponse = checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await syncCollectionsFromSentX();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync collections error:", error);
    return NextResponse.json(
      { error: "Failed to sync collections" },
      { status: 500 }
    );
  }
}

/**
 * Sync collections from SentX API to database
 * Incremental sync - processes batches of tokens each call
 * Top collections get full data, others get basic data from Mirror Node
 */
async function syncCollectionsFromSentX() {
  // Get existing token addresses from database
  const existingCollections = await prisma.collection.findMany({
    select: { tokenAddress: true },
  });
  const existingTokens = existingCollections.map(c => c.tokenAddress);

  // Fetch a batch of collections
  const { collections: sentxCollections, hasMore, totalRemaining } = await fetchCollectionsBatch(
    existingTokens,
    200 // Process 200 tokens per sync
  );

  if (sentxCollections.length === 0) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      hasMore: false,
      message: "All collections synced!",
    };
  }

  let created = 0;
  let updated = 0;

  // Process collections
  for (const collection of sentxCollections) {
    try {
      const existing = await prisma.collection.findUnique({
        where: { tokenAddress: collection.token },
      });

      const data = {
        name: collection.name,
        description: collection.description || null,
        image: collection.image || null,
        slug: collection.slug || null,
        floor: Math.round(collection.floor || 0),
        volume: Math.round(collection.volumetotal || 0),
        owners: collection.owners || 0,
        supply: collection.supply || 0,
        sentxStars: collection.stars || 0,
        lastSyncedAt: new Date(),
      };

      if (existing) {
        await prisma.collection.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.collection.create({
          data: {
            tokenAddress: collection.token,
            ...data,
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`Error syncing collection ${collection.token}:`, err);
    }
  }

  const message = hasMore
    ? `Synced ${created} new collections. ${totalRemaining} remaining - click Sync again.`
    : `Synced ${created} new collections. All done!`;

  return {
    synced: sentxCollections.length,
    created,
    updated,
    hasMore,
    totalRemaining,
    message,
  };
}
