import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchKabilaCollections, resolveKabilaImageUrl } from "@/lib/kabila";
import { resolveImageUrl } from "@/lib/sentx";

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
 * Only includes collections with >= 300 HBAR volume (from Kabila networkVolume)
 * Links point to SentX marketplace
 */
async function syncCollectionsFromKabila() {
  const MIN_VOLUME_HBAR = 300;

  // Fetch all collections from Kabila
  const kabilaCollections = await fetchKabilaCollections();

  if (kabilaCollections.length === 0) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      message: "No collections found from Kabila API",
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process collections
  for (const collection of kabilaCollections) {
    try {
      // Get volume from Kabila (networkVolume is in tinybars, convert to HBAR)
      const volumeHbar = collection.networkVolume
        ? Math.round(collection.networkVolume / 100000000)
        : 0;

      // Skip collections with less than MIN_VOLUME_HBAR volume
      if (volumeHbar < MIN_VOLUME_HBAR) {
        skipped++;
        continue;
      }

      // Use Kabila data directly
      const image = resolveKabilaImageUrl(collection.logoUrl || collection.bannerUrl);
      const floor = collection.minPrice ? Math.round(collection.minPrice) : 0;
      const owners = collection.holders || 0;
      const supply = collection.supply || 0;

      const existing = await prisma.collection.findUnique({
        where: { tokenAddress: collection.tokenId },
      });

      if (existing) {
        await prisma.collection.update({
          where: { id: existing.id },
          data: {
            name: collection.name,
            description: collection.description || undefined,
            ...(image && { image }),
            floor,
            volume: volumeHbar,
            owners,
            supply,
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
            slug: collection.tokenId,
            floor,
            volume: volumeHbar,
            owners,
            supply,
            sentxStars: 0,
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
    synced: created + updated,
    created,
    updated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    message: `Synced ${created} new, updated ${updated} existing. Skipped ${skipped} with <${MIN_VOLUME_HBAR} HBAR volume.`,
  };
}
