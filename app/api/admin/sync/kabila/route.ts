import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchKabilaLaunchpads,
  mapKabilaState,
  getKabilaLaunchpadUrl,
  resolveKabilaImageUrl,
  getKabilaMintDate,
  formatKabilaPrice,
} from "@/lib/kabila";

// POST /api/admin/sync/kabila - Import launchpads from Kabila
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await syncLaunchpadsFromKabila(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync Kabila launchpads error:", error);
    return NextResponse.json(
      { error: "Failed to sync Kabila launchpads" },
      { status: 500 }
    );
  }
}

// GET /api/admin/sync/kabila - Get sync status/preview
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch launchpads from Kabila
    const launchpads = await fetchKabilaLaunchpads();

    // Filter to only LIVE and UPCOMING (not FINISHED)
    const activeLaunchpads = launchpads.filter(
      (lp) => lp.state !== "FINISHED"
    );

    // Get existing events from Kabila
    const existingEvents = await prisma.event.findMany({
      where: {
        source: "KABILA",
        externalId: { not: null },
      },
      select: { externalId: true },
    });

    const existingIds = new Set(existingEvents.map((e) => e.externalId));

    // Categorize
    const newLaunchpads = activeLaunchpads.filter(
      (lp) => !existingIds.has(String(lp.id))
    );

    return NextResponse.json({
      total: launchpads.length,
      active: activeLaunchpads.length,
      finished: launchpads.length - activeLaunchpads.length,
      new: newLaunchpads.length,
      existing: activeLaunchpads.length - newLaunchpads.length,
      preview: newLaunchpads.slice(0, 10).map((lp) => ({
        name: lp.name,
        price: formatKabilaPrice(lp.price, lp.currency),
        state: lp.state,
        supply: lp.numNftForSale,
      })),
    });
  } catch (error) {
    console.error("Get Kabila sync preview error:", error);
    return NextResponse.json(
      { error: "Failed to get Kabila sync preview" },
      { status: 500 }
    );
  }
}

/**
 * Sync launchpad events from Kabila API to database
 * Only imports LIVE and UPCOMING (not FINISHED)
 */
async function syncLaunchpadsFromKabila(adminUserId: string) {
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

  console.log(`Kabila Cleanup: ${updatedToLive.count} UPCOMING→LIVE, ${updatedToEnded.count} LIVE→ENDED, ${deletedEnded.count} ENDED deleted`);

  // === FETCH AND SYNC ===

  // Fetch launchpads from Kabila
  const launchpads = await fetchKabilaLaunchpads();

  if (launchpads.length === 0) {
    return {
      synced: 0,
      cleanup: {
        updatedToLive: updatedToLive.count,
        updatedToEnded: updatedToEnded.count,
        deleted: deletedEnded.count,
      },
      message: "No launchpads found from Kabila API",
    };
  }

  // Filter to only LIVE and UPCOMING (not FINISHED)
  const activeLaunchpads = launchpads.filter((lp) => {
    const status = mapKabilaState(lp.state);
    return status !== "ENDED";
  });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const lp of activeLaunchpads) {
    try {
      // Get mint date (can be null if TBA)
      const mintDate = getKabilaMintDate(lp.accesses);

      // Determine status - use Kabila's state, but if mintDate is null, keep as UPCOMING
      let status = mapKabilaState(lp.state);
      // If no date (TBA), override to UPCOMING regardless of Kabila state
      if (!mintDate && status === "LIVE") {
        status = "UPCOMING";
      }

      const mintPrice = formatKabilaPrice(lp.price, lp.currency);
      const imageUrl = resolveKabilaImageUrl(lp.logoUrl || lp.bannerUrl);

      // Upsert event
      const result = await prisma.event.upsert({
        where: {
          source_externalId: {
            source: "KABILA",
            externalId: String(lp.id),
          },
        },
        create: {
          title: lp.name,
          description: lp.description || `Kabila launchpad: ${lp.name}`,
          mintDate,
          mintPrice,
          supply: lp.numNftForSale || null,
          imageUrl,
          websiteUrl: getKabilaLaunchpadUrl(lp.id),
          status,
          isApproved: true,
          isForeverMint: false,
          source: "KABILA",
          externalId: String(lp.id),
          createdById: adminUserId,
        },
        update: {
          title: lp.name,
          description: lp.description || `Kabila launchpad: ${lp.name}`,
          mintPrice,
          supply: lp.numNftForSale || null,
          imageUrl,
          status,
        },
      });

      // Check if created or updated
      if (result.createdAt === result.updatedAt) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`Failed to import Kabila launchpad ${lp.name}:`, error);
      errors.push(lp.name || `ID: ${lp.id}`);
    }
  }

  return {
    synced: activeLaunchpads.length,
    created,
    updated,
    skipped: launchpads.length - activeLaunchpads.length,
    cleanup: {
      updatedToLive: updatedToLive.count,
      updatedToEnded: updatedToEnded.count,
      deleted: deletedEnded.count,
    },
    errors: errors.length > 0 ? errors : undefined,
    message: `Imported ${created} new, updated ${updated} existing from Kabila. Cleanup: ${deletedEnded.count} old events removed.`,
  };
}
