import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
import {
  fetchSupportedTokenList,
  fetchCollectionStats,
  fetchTokenFromMirrorNode,
  resolveImageUrl,
} from "@/lib/sentx";

const MIN_VOLUME_HBAR = 20000;

// GET /api/collections - List collections with rankings
// Returns top 30 best voted + top 10 worst voted (or search results)
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    // Limit search to 100 chars to prevent ReDoS attacks
    const rawSearch = searchParams.get("search");
    const search = rawSearch ? rawSearch.slice(0, 100) : null;
    const shouldSync = searchParams.get("sync") === "true";

    // Optionally sync from SentX (admin only, called less frequently)
    if (shouldSync) {
      const user = await getCurrentUser();
      if (user?.isAdmin) {
        await syncCollectionsFromSentX();
      }
    }

    // Get total count of approved and visible collections only
    const total = await prisma.collection.count({
      where: { isApproved: true, isHidden: false },
    });

    // Get user for vote mapping
    const user = await getCurrentUser();

    // If searching, return search results (only approved and visible collections)
    if (search) {
      const searchWhere = {
        isApproved: true,
        isHidden: false,
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

    // Get top 30 best voted (only approved and visible)
    const topCollections = await prisma.collection.findMany({
      where: { isApproved: true, isHidden: false },
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

    // Get top 10 worst voted (lowest votes, excluding those already in top, only approved and visible)
    const topIds = topCollections.map(c => c.id);
    const worstCollections = await prisma.collection.findMany({
      where: {
        isApproved: true,
        isHidden: false,
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
        rank: total - index, // Worst = highest rank number (e.g. 1273, 1272, 1271...)
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

// POST /api/collections - Sync collections from SentX
export async function POST(request: NextRequest) {
  // Rate limiting - stricter for sync operations
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

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

// DELETE /api/collections - Delete all collections (admin only)
export async function DELETE(request: NextRequest) {
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

    // Delete all collection votes first (due to foreign key)
    await prisma.collectionVote.deleteMany({});

    // Delete all collections
    const deleted = await prisma.collection.deleteMany({});

    return NextResponse.json({
      deleted: deleted.count,
      message: `Deleted ${deleted.count} collections and all their votes.`,
    });
  } catch (error) {
    console.error("Delete collections error:", error);
    return NextResponse.json(
      { error: "Failed to delete collections" },
      { status: 500 }
    );
  }
}

/**
 * Sync collections from SentX API to database
 * 1. Get all supported tokens from /v1/public/token/supportedlist
 * 2. For each token, get stats from /v1/public/market/stats/token
 * 3. If volume >= 20k HBAR, get token info from Hedera Mirror Node
 * 4. Save to database
 */
async function syncCollectionsFromSentX() {
  console.log("Starting SentX collections sync...");

  // Step 1: Get all supported tokens
  const supportedTokens = await fetchSupportedTokenList();

  if (supportedTokens.length === 0) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      message: "No supported tokens found from SentX API",
    };
  }

  console.log(`Found ${supportedTokens.length} supported tokens from SentX`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  const errors: string[] = [];

  // Process tokens in batches to avoid rate limiting
  const BATCH_SIZE = 10;
  const DELAY_MS = 100;

  for (let i = 0; i < supportedTokens.length; i += BATCH_SIZE) {
    const batch = supportedTokens.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (tokenId) => {
        try {
          // Step 2: Get stats from SentX
          const stats = await fetchCollectionStats(tokenId);

          if (!stats) {
            return { status: "skipped", reason: "no_stats" };
          }

          // Check volume (volumetotal is in HBAR)
          const volumeHbar = Math.round(stats.volumetotal || stats.volume || 0);

          if (volumeHbar < MIN_VOLUME_HBAR) {
            return { status: "skipped", reason: "low_volume" };
          }

          // Step 3: Get token info from Hedera if needed
          let name = stats.name;
          let supply = stats.supply || 0;

          if (!name || name === "Unknown") {
            const hederaInfo = await fetchTokenFromMirrorNode(tokenId);
            if (hederaInfo) {
              name = hederaInfo.name || tokenId;
              supply = parseInt(hederaInfo.total_supply) || supply;
            }
          }

          // Step 4: Save to database
          const existing = await prisma.collection.findUnique({
            where: { tokenAddress: tokenId },
          });

          const collectionData = {
            name: name || tokenId,
            description: stats.description || undefined,
            image: stats.image || undefined,
            slug: stats.slug || tokenId,
            floor: Math.round(stats.floor || 0),
            volume: volumeHbar,
            owners: stats.owners || 0,
            supply,
            sentxStars: stats.stars || 0,
            lastSyncedAt: new Date(),
          };

          if (existing) {
            await prisma.collection.update({
              where: { id: existing.id },
              data: collectionData,
            });
            return { status: "updated", tokenId };
          } else {
            await prisma.collection.create({
              data: {
                tokenAddress: tokenId,
                ...collectionData,
              },
            });
            return { status: "created", tokenId };
          }
        } catch (err) {
          console.error(`Error processing token ${tokenId}:`, err);
          return { status: "error", tokenId };
        }
      })
    );

    // Count results
    for (const result of results) {
      processed++;
      if (result.status === "created") created++;
      else if (result.status === "updated") updated++;
      else if (result.status === "skipped") skipped++;
      else if (result.status === "error") errors.push(result.tokenId || "unknown");
    }

    // Log progress
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= supportedTokens.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, supportedTokens.length)}/${supportedTokens.length} tokens. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    }

    // Delay between batches
    if (i + BATCH_SIZE < supportedTokens.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`SentX sync complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`);

  return {
    synced: created + updated,
    created,
    updated,
    skipped,
    processed,
    totalTokens: supportedTokens.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    message: `Synced ${created} new, updated ${updated} existing. Skipped ${skipped} with <${MIN_VOLUME_HBAR / 1000}k HBAR volume.`,
  };
}
