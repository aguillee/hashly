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

    // Fetch mint events from SentX
    const mintEvents = await fetchMintEvents({ hideSoldOut: false });

    // Get existing events by token address
    const existingTokens = await prisma.event.findMany({
      where: {
        websiteUrl: { contains: "sentx.io" },
      },
      select: { title: true, websiteUrl: true },
    });

    const existingUrls = new Set(existingTokens.map((e) => e.websiteUrl));

    // Categorize events
    const newEvents = mintEvents.filter((e) => !existingUrls.has(e.url));
    const existingEvents = mintEvents.filter((e) => existingUrls.has(e.url));

    return NextResponse.json({
      total: mintEvents.length,
      new: newEvents.length,
      existing: existingEvents.length,
      preview: newEvents.slice(0, 10).map((e) => ({
        name: e.mintEventName,
        collection: e.collectionName,
        price: e.mintPrice,
        startDate: e.startDate,
        isSoldOut: e.isSoldOut,
      })),
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

  // Fetch active and upcoming mint events from SentX
  const mintEvents = await fetchMintEvents({ hideSoldOut: false });

  if (mintEvents.length === 0) {
    return { synced: 0, message: "No mint events found from SentX (API may have returned empty)" };
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const event of mintEvents) {
    try {
      // Check if event already exists (by URL which is unique per mint event)
      const existing = await prisma.event.findFirst({
        where: {
          websiteUrl: event.url,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Determine mint date
      let mintDate: Date;
      if (event.startDateUnix) {
        mintDate = new Date(event.startDateUnix * 1000);
      } else if (event.startDate) {
        mintDate = new Date(event.startDate);
      } else {
        // If no start date, use current time (it's probably live)
        mintDate = new Date();
      }

      // Determine status
      let status: "UPCOMING" | "LIVE" | "ENDED" = "UPCOMING";
      const now = new Date();

      if (event.isSoldOut) {
        status = "ENDED";
      } else if (mintDate <= now) {
        status = "LIVE";
      }

      // Format price
      const mintPrice = event.mintPrice > 0
        ? `${event.mintPrice} HBAR`
        : "Free";

      // Create title from event name or collection name
      const title = event.mintEventName || event.collectionName || "SentX Mint";

      // Create event
      await prisma.event.create({
        data: {
          title,
          description: event.description || `Mint event for ${event.collectionName}. ${event.availableCount} of ${event.totalCount} available.`,
          mintDate,
          mintPrice,
          supply: event.totalCount || null,
          imageUrl: resolveImageUrl(event.image),
          websiteUrl: event.url,
          category: "pfp", // Default category
          status,
          isApproved: true, // Auto-approve SentX imports
          createdById: adminUserId,
        },
      });

      created++;
    } catch (error) {
      console.error(`Failed to import event ${event.mintEventName}:`, error);
      errors.push(event.mintEventName || "Unknown event");
    }
  }

  return {
    synced: mintEvents.length,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    message: `Imported ${created} new events, skipped ${skipped} existing`,
  };
}
