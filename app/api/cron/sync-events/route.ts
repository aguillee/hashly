import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMintEvents, resolveImageUrl } from "@/lib/sentx";
import {
  fetchKabilaLaunchpads,
  mapKabilaState,
  getKabilaLaunchpadUrl,
  resolveKabilaImageUrl,
  getKabilaMintDate,
  formatKabilaPrice,
} from "@/lib/kabila";
import {
  fetchDreamBayLaunchpads,
  getDreamBayMintPrice,
} from "@/lib/dreambay";

export const maxDuration = 300; // 5 min timeout for Vercel Pro

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// GET /api/cron/sync-events — Called by Vercel Cron daily at 00:00 UTC
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get system admin user for createdById
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
      select: { id: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "No admin user found" },
        { status: 500 }
      );
    }

    const results = {
      sentx: { created: 0, updated: 0, skipped: 0, errors: 0 },
      kabila: { created: 0, updated: 0, skipped: 0, errors: 0 },
      dreambay: { created: 0, updated: 0, skipped: 0, errors: 0 },
      cleanup: { updatedToLive: 0, deletedEnded: 0, deletedOld: 0, fixedForeverMints: 0 },
    };

    const now = new Date();

    // ============================================
    // CLEANUP: Update status based on time
    // ============================================

    // 1. Update UPCOMING events that should now be LIVE (mintDate has passed)
    const updatedToLive = await prisma.event.updateMany({
      where: {
        status: "UPCOMING",
        isForeverMint: false,
        mintDate: {
          not: null,
          lte: now,
        },
      },
      data: { status: "LIVE" },
    });
    results.cleanup.updatedToLive = updatedToLive.count;

    // 2. Delete events whose endDate has passed
    const deletedEnded = await prisma.event.deleteMany({
      where: {
        isForeverMint: false,
        endDate: {
          not: null,
          lt: now,
        },
      },
    });
    results.cleanup.deletedEnded = deletedEnded.count;

    // 3. Delete LIVE mint events older than 7 days (only MINT_EVENT, not meetups/hackathons)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deletedOld = await prisma.event.deleteMany({
      where: {
        status: "LIVE",
        isForeverMint: false,
        NOT: { event_type: { in: ["ECOSYSTEM_MEETUP", "HACKATHON"] } },
        mintDate: {
          not: null,
          lt: sevenDaysAgo,
        },
      },
    });
    results.cleanup.deletedOld = deletedOld.count;

    // 4. Ensure ALL Forever Mints are LIVE
    const fixedForeverMints = await prisma.event.updateMany({
      where: {
        isForeverMint: true,
        status: { not: "LIVE" },
      },
      data: { status: "LIVE" },
    });
    results.cleanup.fixedForeverMints = fixedForeverMints.count;

    console.log(`[Cron Sync] Cleanup: ${updatedToLive.count} UPCOMING→LIVE, ${deletedEnded.count} ended deleted, ${deletedOld.count} old LIVE deleted`);

    // ============================================
    // SYNC FROM SENTX
    // ============================================
    try {
      const allMintEvents = await fetchMintEvents({ hideSoldOut: true });
      console.log(`[Cron Sync] Fetched ${allMintEvents.length} events from SentX`);

      const foreverMints = allMintEvents.filter((event) => event.isForeverMint === 1);
      const regularEvents = allMintEvents.filter((event) => event.isForeverMint !== 1);

      // Filter regular events (not sold out, not ended)
      const activeRegularEvents = regularEvents.filter((event) => {
        if (event.isSoldOut) return false;
        if (event.endDateUnix) {
          const endDate = new Date(event.endDateUnix * 1000);
          if (endDate < now) return false;
        }
        return true;
      });

      // Process regular events
      for (const event of activeRegularEvents) {
        try {
          let mintDate: Date | null = null;
          if (event.startDateUnix) {
            mintDate = new Date(event.startDateUnix * 1000);
          } else if (event.startDate) {
            mintDate = new Date(event.startDate);
          }

          const endDate = event.endDateUnix ? new Date(event.endDateUnix * 1000) : null;

          // Skip events without mint date or already live
          if (!mintDate || mintDate <= now) {
            results.sentx.skipped++;
            continue;
          }

          const mintPrice = event.mintPrice > 0 ? `${event.mintPrice} HBAR` : "Free";
          const title = event.mintEventName || event.collectionName || "SentX Mint";
          const description = stripHtml(event.description) || `Mint event for ${event.collectionName}. ${event.availableCount} of ${event.totalCount} available.`;

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
              endDate,
              mintPrice,
              supply: event.totalCount || null,
              imageUrl: resolveImageUrl(event.image),
              websiteUrl: event.url,
              status: "UPCOMING",
              isApproved: true,
              isForeverMint: false,
              source: "SENTX",
              externalId: event.mintCode,
              createdById: adminUser.id,
            },
            update: {
              title,
              description,
              endDate,
              mintPrice,
              supply: event.totalCount || null,
              imageUrl: resolveImageUrl(event.image),
              status: "UPCOMING",
            },
          });

          if (result.createdAt === result.updatedAt) {
            results.sentx.created++;
          } else {
            results.sentx.updated++;
          }
        } catch (error) {
          console.error(`[Cron Sync] SentX error for ${event.mintEventName}:`, error);
          results.sentx.errors++;
        }
      }

      // Process Forever Mints
      for (const event of foreverMints) {
        try {
          let mintDate: Date | null = null;
          if (event.startDateUnix) {
            mintDate = new Date(event.startDateUnix * 1000);
          } else if (event.startDate) {
            mintDate = new Date(event.startDate);
          }

          const mintPrice = event.mintPrice > 0 ? `${event.mintPrice} HBAR` : "Free";
          const title = event.mintEventName || event.collectionName || "Forever Mint";
          const foreverDescription = stripHtml(event.description) || `Forever mint for ${event.collectionName}. Always available to mint.`;

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
              status: "LIVE",
              isApproved: true,
              isForeverMint: true,
              source: "SENTX",
              externalId: event.mintCode,
              createdById: adminUser.id,
            },
            update: {
              title,
              description: foreverDescription,
              mintPrice,
              supply: event.totalCount || null,
              imageUrl: resolveImageUrl(event.image),
              status: "LIVE",
              isForeverMint: true,
            },
          });

          if (result.createdAt === result.updatedAt) {
            results.sentx.created++;
          } else {
            results.sentx.updated++;
          }
        } catch (error) {
          console.error(`[Cron Sync] SentX forever mint error:`, error);
          results.sentx.errors++;
        }
      }
    } catch (error) {
      console.error("[Cron Sync] SentX fetch error:", error);
    }

    // ============================================
    // SYNC FROM KABILA
    // ============================================
    try {
      const launchpads = await fetchKabilaLaunchpads();
      console.log(`[Cron Sync] Fetched ${launchpads.length} launchpads from Kabila`);

      const activeLaunchpads = launchpads.filter((lp) => {
        const status = mapKabilaState(lp.state);
        return status !== "FINISHED";
      });

      for (const lp of activeLaunchpads) {
        try {
          const mintDate = getKabilaMintDate(lp.accesses);

          // Skip events without mint date or already live
          if (!mintDate || mintDate <= now) {
            results.kabila.skipped++;
            continue;
          }

          const mintPrice = formatKabilaPrice(lp.price, lp.currency);
          const imageUrl = resolveKabilaImageUrl(lp.logoUrl || lp.bannerUrl);
          const description = stripHtml(lp.description) || `Kabila launchpad: ${lp.name}`;

          const result = await prisma.event.upsert({
            where: {
              source_externalId: {
                source: "KABILA",
                externalId: String(lp.id),
              },
            },
            create: {
              title: lp.name,
              description,
              mintDate,
              mintPrice,
              supply: lp.numNftForSale || null,
              imageUrl,
              websiteUrl: getKabilaLaunchpadUrl(lp.id),
              status: "UPCOMING",
              isApproved: true,
              isForeverMint: false,
              source: "KABILA",
              externalId: String(lp.id),
              createdById: adminUser.id,
            },
            update: {
              title: lp.name,
              description,
              mintPrice,
              supply: lp.numNftForSale || null,
              imageUrl,
              status: "UPCOMING",
            },
          });

          if (result.createdAt === result.updatedAt) {
            results.kabila.created++;
          } else {
            results.kabila.updated++;
          }
        } catch (error) {
          console.error(`[Cron Sync] Kabila error for ${lp.name}:`, error);
          results.kabila.errors++;
        }
      }
    } catch (error) {
      console.error("[Cron Sync] Kabila fetch error:", error);
    }

    // ============================================
    // SYNC FROM DREAMBAY
    // ============================================
    try {
      const launchpads = await fetchDreamBayLaunchpads();
      console.log(`[Cron Sync] Fetched ${launchpads.length} launchpads from DreamBay`);

      const activeLaunchpads = launchpads.filter((lp) => lp.status === "minting");

      for (const lp of activeLaunchpads) {
        try {
          const mintPrice = getDreamBayMintPrice(lp.stages);
          const description = stripHtml(lp.description) || `DreamBay launchpad: ${lp.name}`;
          const imageUrl = lp.bannerUrl || (lp.gallery.length > 0 ? lp.gallery[0] : null);

          const result = await prisma.event.upsert({
            where: {
              source_externalId: {
                source: "DREAMBAY",
                externalId: lp.slug,
              },
            },
            create: {
              title: lp.name,
              description,
              mintDate: null,
              mintPrice,
              supply: lp.totalSupply || null,
              imageUrl,
              websiteUrl: lp.mintUrl,
              twitterUrl: lp.socials.twitter || null,
              discordUrl: lp.socials.discord ? (lp.socials.discord.startsWith("http") ? lp.socials.discord : `https://${lp.socials.discord}`) : null,
              status: "LIVE",
              isApproved: true,
              isForeverMint: false,
              source: "DREAMBAY",
              externalId: lp.slug,
              createdById: adminUser.id,
            },
            update: {
              title: lp.name,
              description,
              mintPrice,
              supply: lp.totalSupply || null,
              imageUrl,
              twitterUrl: lp.socials.twitter || null,
              status: "LIVE",
            },
          });

          if (result.createdAt === result.updatedAt) {
            results.dreambay.created++;
          } else {
            results.dreambay.updated++;
          }
        } catch (error) {
          console.error(`[Cron Sync] DreamBay error for ${lp.name}:`, error);
          results.dreambay.errors++;
        }
      }
    } catch (error) {
      console.error("[Cron Sync] DreamBay fetch error:", error);
    }

    console.log("[Cron Sync] Completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
      message: `SentX: ${results.sentx.created} created, ${results.sentx.updated} updated. Kabila: ${results.kabila.created} created, ${results.kabila.updated} updated. DreamBay: ${results.dreambay.created} created, ${results.dreambay.updated} updated. Cleanup: ${results.cleanup.deletedOld + results.cleanup.deletedEnded} deleted.`,
    });
  } catch (error) {
    console.error("[Cron Sync] Failed:", error);
    return NextResponse.json(
      { error: "Failed to sync events" },
      { status: 500 }
    );
  }
}
