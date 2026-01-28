import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchMintEvents, resolveImageUrl } from "@/lib/sentx";

// POST /api/admin/sync - Import launchpads from SentX
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await syncLaunchpadsFromSentX(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync launchpads error:", error);
    return NextResponse.json(
      { error: "Failed to sync launchpads" },
      { status: 500 }
    );
  }
}

// GET /api/admin/sync - Get sync status/preview
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch active mint events from SentX (not sold out)
    const mintEvents = await fetchMintEvents({ hideSoldOut: true });

    // Separate forever mints from regular events
    const foreverMints = mintEvents.filter(e => e.isForeverMint === 1);
    const regularEvents = mintEvents.filter(e => e.isForeverMint !== 1);

    // Get existing events by externalId
    const existingEvents = await prisma.event.findMany({
      where: {
        source: "SENTX",
        externalId: { not: null },
      },
      select: { externalId: true },
    });

    const existingIds = new Set(existingEvents.map((e) => e.externalId));

    // Categorize events
    const newRegular = regularEvents.filter((e) => !existingIds.has(e.mintCode));
    const newForever = foreverMints.filter((e) => !existingIds.has(e.mintCode));

    return NextResponse.json({
      total: mintEvents.length,
      regularEvents: regularEvents.length,
      foreverMints: foreverMints.length,
      newRegular: newRegular.length,
      newForever: newForever.length,
      preview: {
        regular: newRegular.slice(0, 5).map((e) => ({
          name: e.mintEventName || e.collectionName,
          price: e.mintPrice,
          startDate: e.startDate,
        })),
        forever: newForever.slice(0, 5).map((e) => ({
          name: e.mintEventName || e.collectionName,
          price: e.mintPrice,
        })),
      },
    });
  } catch (error) {
    console.error("Get sync preview error:", error);
    return NextResponse.json(
      { error: "Failed to get sync preview" },
      { status: 500 }
    );
  }
}

/**
 * Sync launchpad events from SentX API to database
 * Now handles Forever Mints separately
 */
async function syncLaunchpadsFromSentX(adminUserId: string) {
  // Check if API key is configured
  if (!process.env.SENTX_API_KEY) {
    return {
      synced: 0,
      created: 0,
      error: "SENTX_API_KEY not configured",
      message: "Please add SENTX_API_KEY to environment variables"
    };
  }

  const now = new Date();

  // === CLEANUP: Update status based on time ===

  // 1. Update UPCOMING events that should now be LIVE (mintDate has passed)
  // Only for events WITH a mint date (not TBA)
  const updatedToLive = await prisma.event.updateMany({
    where: {
      status: "UPCOMING",
      isForeverMint: false,
      mintDate: {
        not: null,
        lte: now
      }
    },
    data: { status: "LIVE" }
  });

  // 2. Mark LIVE events older than 15 days as ENDED (except Forever Mints)
  // Only for events WITH a mint date
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const updatedToEnded = await prisma.event.updateMany({
    where: {
      status: "LIVE",
      isForeverMint: false,
      mintDate: {
        not: null,
        lt: fifteenDaysAgo
      }
    },
    data: { status: "ENDED" }
  });

  // 3. Delete ENDED events (cleanup - they're no longer relevant)
  const deletedEnded = await prisma.event.deleteMany({
    where: {
      status: "ENDED",
      isForeverMint: false
    }
  });

  console.log(`Cleanup: ${updatedToLive.count} UPCOMING→LIVE, ${updatedToEnded.count} LIVE→ENDED, ${deletedEnded.count} ENDED deleted`);

  // === FETCH AND SYNC ===

  // Fetch mint events from SentX (only active ones, not sold out)
  const allMintEvents = await fetchMintEvents({ hideSoldOut: true });

  // Separate Forever Mints from regular events
  const foreverMints = allMintEvents.filter(event => event.isForeverMint === 1);
  const regularEvents = allMintEvents.filter(event => event.isForeverMint !== 1);

  // Filter regular events to only LIVE or UPCOMING (not ended)
  const activeRegularEvents = regularEvents.filter(event => {
    if (event.isSoldOut) return false;

    // Check if ended (has end date and it's passed)
    if (event.endDateUnix) {
      const endDate = new Date(event.endDateUnix * 1000);
      if (endDate < now) return false;
    }

    return true;
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process regular events
  for (const event of activeRegularEvents) {
    try {
      // Determine mint date (null if TBA)
      let mintDate: Date | null = null;
      if (event.startDateUnix) {
        mintDate = new Date(event.startDateUnix * 1000);
      } else if (event.startDate) {
        mintDate = new Date(event.startDate);
      }
      // If no date, leave as null (TBA)

      // Determine status
      // If no mint date (TBA), set as UPCOMING
      const status: "UPCOMING" | "LIVE" =
        mintDate && mintDate <= now ? "LIVE" : "UPCOMING";

      // Format price
      const mintPrice = event.mintPrice > 0 ? `${event.mintPrice} HBAR` : "Free";

      // Create title
      const title = event.mintEventName || event.collectionName || "SentX Mint";

      // Upsert event
      const result = await prisma.event.upsert({
        where: {
          source_externalId: {
            source: "SENTX",
            externalId: event.mintCode,
          },
        },
        create: {
          title,
          description: event.description || `Mint event for ${event.collectionName}. ${event.availableCount} of ${event.totalCount} available.`,
          mintDate,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          websiteUrl: event.url,
          status,
          isApproved: true,
          isForeverMint: false,
          source: "SENTX",
          externalId: event.mintCode,
          createdById: adminUserId,
        },
        update: {
          title,
          description: event.description || `Mint event for ${event.collectionName}. ${event.availableCount} of ${event.totalCount} available.`,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          status,
        },
      });

      if (result.createdAt === result.updatedAt) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`Failed to import event ${event.mintEventName}:`, error);
      errors.push(event.mintEventName || "Unknown event");
    }
  }

  // Process Forever Mints (always LIVE)
  for (const event of foreverMints) {
    try {
      // Determine mint date (null if TBA - Forever Mints often don't have dates)
      let mintDate: Date | null = null;
      if (event.startDateUnix) {
        mintDate = new Date(event.startDateUnix * 1000);
      } else if (event.startDate) {
        mintDate = new Date(event.startDate);
      }
      // If no date, leave as null (TBA) - Forever Mints are always available anyway

      // Format price
      const mintPrice = event.mintPrice > 0 ? `${event.mintPrice} HBAR` : "Free";

      // Create title
      const title = event.mintEventName || event.collectionName || "Forever Mint";

      // Upsert forever mint (always LIVE status)
      const result = await prisma.event.upsert({
        where: {
          source_externalId: {
            source: "SENTX",
            externalId: event.mintCode,
          },
        },
        create: {
          title,
          description: event.description || `Forever mint for ${event.collectionName}. Always available to mint.`,
          mintDate,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          websiteUrl: event.url,
          status: "LIVE", // Forever mints are always LIVE
          isApproved: true,
          isForeverMint: true,
          source: "SENTX",
          externalId: event.mintCode,
          createdById: adminUserId,
        },
        update: {
          title,
          description: event.description || `Forever mint for ${event.collectionName}. Always available to mint.`,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          status: "LIVE", // Always keep LIVE
          isForeverMint: true,
        },
      });

      if (result.createdAt === result.updatedAt) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`Failed to import forever mint ${event.mintEventName}:`, error);
      errors.push(event.mintEventName || "Unknown forever mint");
    }
  }

  return {
    synced: activeRegularEvents.length + foreverMints.length,
    created,
    updated,
    skipped,
    regularEvents: activeRegularEvents.length,
    foreverMints: foreverMints.length,
    cleanup: {
      updatedToLive: updatedToLive.count,
      updatedToEnded: updatedToEnded.count,
      deleted: deletedEnded.count,
    },
    errors: errors.length > 0 ? errors : undefined,
    message: `Imported ${created} new, updated ${updated} existing (${foreverMints.length} forever mints). Cleanup: ${deletedEnded.count} old events removed.`,
  };
}
