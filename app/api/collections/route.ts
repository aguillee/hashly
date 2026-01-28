import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchKabilaCollections, resolveKabilaImageUrl } from "@/lib/kabila";
import { resolveImageUrl } from "@/lib/sentx";

// GET /api/collections - List collections with rankings
// Returns top 30 best voted + top 10 worst voted (or search results)
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const shouldSync = searchParams.get("sync") === "true";

    // Optionally sync from Kabila (called less frequently)
    if (shouldSync) {
      await syncCollectionsFromKabila();
    }

    // Get total count of all collections
    const total = await prisma.collection.count();

    // Get user for vote mapping
    const user = await getCurrentUser();

    // If searching, return search results
    if (search) {
      const searchWhere = {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      };

      const searchResults = await prisma.collection.findMany({
        where: searchWhere,
        orderBy: { totalVotes: "desc" },
        take: 50,
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
      });

      const userVotesMap = await getUserVotesMap(user, searchResults.map(c => c.id));

      return NextResponse.json({
        collections: searchResults.map((c, index) => ({
          ...c,
          rank: index + 1,
          image: resolveImageUrl(c.image || ""),
          userVote: userVotesMap[c.id] || null,
          lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
          createdAt: c.createdAt.toISOString(),
        })),
        total,
        isSearch: true,
      });
    }

    // Get top 30 best voted
    const topCollections = await prisma.collection.findMany({
      orderBy: { totalVotes: "desc" },
      take: 30,
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
    });

    // Get top 10 worst voted (lowest votes, excluding those already in top)
    const topIds = topCollections.map(c => c.id);
    const worstCollections = await prisma.collection.findMany({
      where: {
        id: { notIn: topIds },
      },
      orderBy: { totalVotes: "asc" },
      take: 10,
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
    });

    // Get user votes for all collections
    const allCollectionIds = [...topCollections, ...worstCollections].map(c => c.id);
    const userVotesMap = await getUserVotesMap(user, allCollectionIds);

    return NextResponse.json({
      top: topCollections.map((c, index) => ({
        ...c,
        rank: index + 1,
        image: resolveImageUrl(c.image || ""),
        userVote: userVotesMap[c.id] || null,
        lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
      worst: worstCollections.map((c, index) => ({
        ...c,
        rank: total - 9 + index, // Rank from bottom
        image: resolveImageUrl(c.image || ""),
        userVote: userVotesMap[c.id] || null,
        lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error("Get collections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// Helper to get user votes map
async function getUserVotesMap(
  user: { walletAddress: string } | null,
  collectionIds: string[]
): Promise<Record<string, { voteWeight: number; nftTokenId?: string }>> {
  if (!user || collectionIds.length === 0) return {};

  const userVotes = await prisma.collectionVote.findMany({
    where: {
      walletAddress: user.walletAddress,
      collectionId: { in: collectionIds },
    },
    select: {
      collectionId: true,
      voteWeight: true,
      nftTokenId: true,
    },
  });

  return userVotes.reduce((acc, v) => {
    acc[v.collectionId] = {
      voteWeight: v.voteWeight,
      nftTokenId: v.nftTokenId || undefined,
    };
    return acc;
  }, {} as Record<string, { voteWeight: number; nftTokenId?: string }>);
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
 * Only includes collections with >= 10,000 HBAR volume (from Kabila networkVolume)
 * Links point to SentX marketplace
 */
async function syncCollectionsFromKabila() {
  const MIN_VOLUME_HBAR = 20000;

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
      // Get volume from Kabila (networkVolume is already in HBAR)
      const volumeHbar = collection.networkVolume
        ? Math.round(collection.networkVolume)
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
    message: `Synced ${created} new, updated ${updated} existing. Skipped ${skipped} with <20k HBAR volume.`,
  };
}
