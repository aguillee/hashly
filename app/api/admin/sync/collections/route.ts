import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchAllKabilaCollections,
  resolveKabilaImageUrl,
  getSentxMarketUrl,
} from "@/lib/kabila";

/**
 * POST /api/admin/sync/collections - Sync ALL collections from Kabila
 * Fetches all collections using pagination
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await syncCollectionsFromKabila();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync Kabila collections error:", error);
    return NextResponse.json(
      { error: "Failed to sync collections from Kabila" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync/collections - Get current collections stats
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get current count in DB
    const dbCount = await prisma.collection.count();
    const kabilaCount = await prisma.collection.count({
      where: { source: "KABILA" }
    });
    const sentxCount = await prisma.collection.count({
      where: { source: "SENTX" }
    });

    // Get top collections by votes
    const topCollections = await prisma.collection.findMany({
      orderBy: { totalVotes: "desc" },
      take: 10,
      select: {
        name: true,
        tokenAddress: true,
        totalVotes: true,
        volume: true,
        source: true,
      },
    });

    return NextResponse.json({
      total: dbCount,
      bySource: {
        kabila: kabilaCount,
        sentx: sentxCount,
      },
      topCollections,
    });
  } catch (error) {
    console.error("Get collections stats error:", error);
    return NextResponse.json(
      { error: "Failed to get collections stats" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sync/collections - Delete all collections (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Delete all collection votes first (due to foreign key)
    const deletedVotes = await prisma.collectionVote.deleteMany({});

    // Delete all collections
    const deletedCollections = await prisma.collection.deleteMany({});

    return NextResponse.json({
      deletedVotes: deletedVotes.count,
      deletedCollections: deletedCollections.count,
      message: `Deleted ${deletedCollections.count} collections and ${deletedVotes.count} votes.`,
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
 * Sync ALL collections from Kabila API to database
 * Uses pagination to fetch all collections
 */
async function syncCollectionsFromKabila() {
  console.log("[COLLECTIONS SYNC] Starting Kabila collections sync...");

  // Fetch ALL collections from Kabila with pagination
  const collections = await fetchAllKabilaCollections({
    batchSize: 500,
  });

  if (collections.length === 0) {
    return {
      synced: 0,
      created: 0,
      updated: 0,
      message: "No collections found from Kabila API",
    };
  }

  console.log(`[COLLECTIONS SYNC] Processing ${collections.length} collections from Kabila`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process collections in batches for DB efficiency
  const BATCH_SIZE = 50;

  for (let i = 0; i < collections.length; i += BATCH_SIZE) {
    const batch = collections.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (collection) => {
        try {
          // Skip if no tokenId
          if (!collection.tokenId) {
            return { status: "skipped", reason: "no_tokenId" };
          }

          // Prepare collection data
          const collectionData = {
            name: collection.name || collection.tokenId,
            description: collection.description || null,
            image: resolveKabilaImageUrl(collection.logoUrl || collection.bannerUrl),
            slug: collection.slug || collection.tokenId,
            floor: Math.round(collection.minPrice || 0),
            volume: Math.round(collection.networkVolume || 0),
            owners: collection.holders || 0,
            supply: collection.supply || collection.minted || 0,
            lastSyncedAt: new Date(),
            source: "KABILA" as const,
            externalId: collection._id,
          };

          // Check if collection already exists
          const existing = await prisma.collection.findUnique({
            where: { tokenAddress: collection.tokenId },
          });

          if (existing) {
            // Update existing (preserve votes)
            await prisma.collection.update({
              where: { id: existing.id },
              data: {
                name: collectionData.name,
                description: collectionData.description,
                image: collectionData.image,
                slug: collectionData.slug,
                floor: collectionData.floor,
                volume: collectionData.volume,
                owners: collectionData.owners,
                supply: collectionData.supply,
                lastSyncedAt: collectionData.lastSyncedAt,
              },
            });
            return { status: "updated", tokenId: collection.tokenId };
          } else {
            // Create new
            await prisma.collection.create({
              data: {
                tokenAddress: collection.tokenId,
                ...collectionData,
              },
            });
            return { status: "created", tokenId: collection.tokenId };
          }
        } catch (err) {
          console.error(`Error processing collection ${collection.tokenId}:`, err);
          return { status: "error", tokenId: collection.tokenId };
        }
      })
    );

    // Count results
    for (const result of results) {
      if (result.status === "created") created++;
      else if (result.status === "updated") updated++;
      else if (result.status === "skipped") skipped++;
      else if (result.status === "error" && result.tokenId) {
        errors.push(result.tokenId);
      }
    }

    // Log progress
    const progress = Math.min(i + BATCH_SIZE, collections.length);
    console.log(`[COLLECTIONS SYNC] Progress: ${progress}/${collections.length} (Created: ${created}, Updated: ${updated})`);
  }

  console.log(`[COLLECTIONS SYNC] Complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`);

  return {
    synced: created + updated,
    created,
    updated,
    skipped,
    total: collections.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    message: `Synced ${created} new + ${updated} updated collections from Kabila. Total: ${collections.length}`,
  };
}
