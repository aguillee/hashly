import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchMintEvents, resolveImageUrl } from "@/lib/sentx";

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")  // Remove HTML tags
    .replace(/&nbsp;/g, " ")   // Replace &nbsp;
    .replace(/&amp;/g, "&")    // Replace &amp;
    .replace(/&lt;/g, "<")     // Replace &lt;
    .replace(/&gt;/g, ">")     // Replace &gt;
    .replace(/&quot;/g, '"')   // Replace &quot;
    .replace(/&#39;/g, "'")    // Replace &#39;
    .replace(/\s+/g, " ")      // Collapse whitespace
    .trim();
}

// POST /api/admin/sync - Import launchpads from SentX
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

  // 2. Delete LIVE events older than 7 days directly (except Forever Mints)
  // No ENDED status - just delete them
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const deletedOld = await prisma.event.deleteMany({
    where: {
      status: "LIVE",
      isForeverMint: false,
      mintDate: {
        not: null,
        lt: sevenDaysAgo
      }
    }
  });

  // 3. Delete any ENDED events that might exist (cleanup legacy)
  const deletedEnded = await prisma.event.deleteMany({
    where: {
      status: "ENDED",
      isForeverMint: false
    }
  });

  // 4. Ensure ALL Forever Mints are LIVE (fix any that got wrong status)
  const fixedForeverMints = await prisma.event.updateMany({
    where: {
      isForeverMint: true,
      status: { not: "LIVE" }
    },
    data: { status: "LIVE" }
  });

  console.log(`Cleanup: ${updatedToLive.count} UPCOMING→LIVE, ${deletedOld.count} old LIVE deleted, ${deletedEnded.count} ENDED deleted, ${fixedForeverMints.count} Forever Mints fixed to LIVE`);

  // === FETCH AND SYNC ===

  // Fetch mint events from SentX (only active ones, not sold out)
  const allMintEvents = await fetchMintEvents({ hideSoldOut: true });

  console.log(`[SYNC] Fetched ${allMintEvents.length} mint events from SentX`);
  if (allMintEvents.length === 0) {
    console.log("[SYNC] WARNING: No events returned from SentX API");
  }

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

  console.log(`[SYNC] Processing ${activeRegularEvents.length} active regular events (now=${now.toISOString()})`);

  // Process regular events - ONLY UPCOMING with a valid mint date in the future
  for (const event of activeRegularEvents) {
    try {
      // Determine mint date (null if TBA)
      let mintDate: Date | null = null;
      if (event.startDateUnix) {
        mintDate = new Date(event.startDateUnix * 1000);
      } else if (event.startDate) {
        mintDate = new Date(event.startDate);
      }

      // SKIP events without a mint date (TBA) - we only want events with dates
      if (!mintDate) {
        console.log(`[SYNC] Skipping ${event.mintEventName}: no mint date (TBA)`);
        skipped++;
        continue;
      }

      // SKIP events that have already started (LIVE) - we only want UPCOMING
      if (mintDate <= now) {
        console.log(`[SYNC] Skipping ${event.mintEventName}: already live (mintDate=${mintDate.toISOString()})`);
        skipped++;
        continue;
      }

      console.log(`[SYNC] Importing ${event.mintEventName} (mintDate=${mintDate.toISOString()})`)

      // Format price
      const mintPrice = event.mintPrice > 0 ? `${event.mintPrice} HBAR` : "Free";

      // Create title
      const title = event.mintEventName || event.collectionName || "SentX Mint";

      // Clean description (strip HTML)
      const description = stripHtml(event.description) || `Mint event for ${event.collectionName}. ${event.availableCount} of ${event.totalCount} available.`;

      // Upsert event - all imported events are UPCOMING (future mint date)
      const result = await prisma.event.upsert({
        where: {
          source_externalId: {
            source: "SENTX",
            externalId: event.mintCode,
          },
        },
        create: {
          title,
          description,
          mintDate,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          websiteUrl: event.url,
          status: "UPCOMING",
          isApproved: true,
          isForeverMint: false,
          source: "SENTX",
          externalId: event.mintCode,
          createdById: adminUserId,
        },
        update: {
          title,
          description,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          status: "UPCOMING",
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

      // Clean description (strip HTML)
      const foreverDescription = stripHtml(event.description) || `Forever mint for ${event.collectionName}. Always available to mint.`;

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
          description: foreverDescription,
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
          description: foreverDescription,
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
    synced: created + updated,
    created,
    updated,
    skipped,
    regularEvents: activeRegularEvents.length,
    foreverMints: foreverMints.length,
    cleanup: {
      updatedToLive: updatedToLive.count,
      deletedOld: deletedOld.count,
      deletedEnded: deletedEnded.count,
    },
    errors: errors.length > 0 ? errors : undefined,
    message: `Imported ${created} new UPCOMING events, updated ${updated} existing (${foreverMints.length} forever mints). Skipped ${skipped} without date or already live. Cleanup: ${deletedOld.count + deletedEnded.count} old events removed.`,
  };
}
