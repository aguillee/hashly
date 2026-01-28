import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchKabilaCollections } from "@/lib/kabila";
import { resolveImageUrl, fetchCollectionStats } from "@/lib/sentx";

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
    const shouldSync = searchParams.get("sync") === "true";

    // Optionally sync from Kabila (called less frequently)
    if (shouldSync) {
      await syncCollectionsFromKabila();
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

// POST /api/collections/sync - Sync collections from Kabila
export async function POST(request: NextRequest) {
  // Rate limiting - stricter for sync operations
  const rateLimitResponse = checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await syncCollectionsFromKabila();
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
 * Sync collections from Kabila API to database
 * Links point to SentX marketplace
 */
async function syncCollectionsFromKabila() {
  // Fetch all collections from Kabila
  const kabilaCollections = await fetchKabilaCollections();

  if (kabilaCollections.length === 0) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      message: "No collections found from Kabila API",
    };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  // Process collections
  for (const collection of kabilaCollections) {
    try {
      const existing = await prisma.collection.findUnique({
        where: { tokenAddress: collection.tokenId },
      });

      // Fetch image and stats from SentX
      let image: string | null = null;
      let floor: number | null = null;
      let volume: number | null = null;
      let owners: number | null = null;
      let supply: number | null = null;
      let sentxStars: number | null = null;
      let slug: string | null = null;

      try {
        const sentxInfo = await fetchCollectionStats(collection.tokenId);
        if (sentxInfo) {
          image = sentxInfo.image || null;
          floor = sentxInfo.floor ? Math.round(sentxInfo.floor) : null;
          volume = sentxInfo.volumetotal ? Math.round(sentxInfo.volumetotal) : null;
          owners = sentxInfo.owners || null;
          supply = sentxInfo.supply || null;
          sentxStars = sentxInfo.stars || null;
          slug = sentxInfo.slug || null;
        }
      } catch (e) {
        // SentX may not have this collection - that's ok
      }

      if (existing) {
        // Only update fields we have values for
        await prisma.collection.update({
          where: { id: existing.id },
          data: {
            name: collection.name,
            description: collection.description || undefined,
            // Only update these if we got values from SentX
            ...(image && { image }),
            ...(slug && { slug }),
            ...(floor !== null && { floor }),
            ...(volume !== null && { volume }),
            ...(owners !== null && { owners }),
            ...(supply !== null && { supply }),
            ...(sentxStars !== null && { sentxStars }),
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.collection.create({
          data: {
            tokenAddress: collection.tokenId,
            name: collection.name,
            description: collection.description || undefined,
            image: image || undefined,
            slug: slug || collection.tokenId,
            floor: floor || 0,
            volume: volume || 0,
            owners: owners || 0,
            supply: supply || 0,
            sentxStars: sentxStars || 0,
            lastSyncedAt: new Date(),
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`Error syncing collection ${collection.tokenId}:`, err);
      errors.push(collection.name || collection.tokenId);
    }
  }

  return {
    synced: kabilaCollections.length,
    created,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    message: `Synced ${created} new, updated ${updated} existing collections from Kabila`,
  };
}
