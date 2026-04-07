import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchDreamBayLaunchpads, getDreamBayMintPrice, fetchDreamCastPools, getDreamCastMintPrice, getDreamCastMintUrl } from "@/lib/dreambay";

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

// POST /api/admin/sync/dreambay - Import launchpads from DreamBay
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

    const launchpads = await fetchDreamBayLaunchpads();
    const activeLaunchpads = launchpads.filter((lp) => lp.status === "minting");

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    const now = new Date();
    for (const lp of activeLaunchpads) {
      try {
        const mintPrice = getDreamBayMintPrice(lp.stages);
        const description = stripHtml(lp.description) || `DreamBay launchpad: ${lp.name}`;
        const imageUrl = lp.bannerUrl || (lp.gallery.length > 0 ? lp.gallery[0] : null);

        // Parse dates
        const startDateStr = lp.startDate || (lp.stages.length > 0 ? lp.stages[0].startDate : null);
        const endDateStr = lp.endDate || (lp.stages.length > 0 ? lp.stages[lp.stages.length - 1].endDate : null);
        const mintDate = startDateStr ? new Date(startDateStr) : null;
        // If no endDate, default to 7 days after startDate
        const endDate = endDateStr
          ? new Date(endDateStr)
          : mintDate
            ? new Date(mintDate.getTime() + 7 * 24 * 60 * 60 * 1000)
            : null;
        const eventStatus = mintDate && mintDate <= now ? "LIVE" : "UPCOMING";

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
            mintDate,
            endDate,
            mintPrice,
            supply: lp.totalSupply || null,
            imageUrl,
            websiteUrl: lp.mintUrl,
            twitterUrl: lp.socials.twitter || null,
            discordUrl: lp.socials.discord
              ? lp.socials.discord.startsWith("http")
                ? lp.socials.discord
                : `https://${lp.socials.discord}`
              : null,
            status: eventStatus,
            isApproved: true,
            isForeverMint: false,
            source: "DREAMBAY",
            externalId: lp.slug,
            createdById: user.id,
          },
          update: {
            title: lp.name,
            description,
            mintDate,
            endDate,
            mintPrice,
            supply: lp.totalSupply || null,
            imageUrl,
            twitterUrl: lp.socials.twitter || null,
            status: eventStatus,
          },
        });

        if (result.createdAt === result.updatedAt) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`Failed to import DreamBay launchpad ${lp.name}:`, error);
        errors.push(lp.name);
      }
    }

    // ─── DreamCast Pools (Forever Mints) ───
    let dcCreated = 0;
    let dcUpdated = 0;
    const dcErrors: string[] = [];

    try {
      const pools = await fetchDreamCastPools();

      for (const pool of pools) {
        try {
          const mintPrice = getDreamCastMintPrice(pool.mint_price);
          const description = pool.description || `DreamCast pool: ${pool.name}`;
          const imageUrl = pool.banner || pool.avatar || null;

          // Build metadata with DreamCast-specific info
          const metadata = {
            dreamcast: true,
            badge: pool.badge,
            buybackEnabled: pool.buyback_enabled,
            tiers: pool.pool_slots_tiers,
            stats: pool.stats,
            previews: (pool.pool_slots_previews || []).slice(0, 10).map((p) => ({
              image: p.image,
              tier: p.tier,
              name: p.name,
            })),
          };

          const result = await prisma.event.upsert({
            where: {
              source_externalId: {
                source: "DREAMBAY",
                externalId: `dreamcast-${pool.slug}`,
              },
            },
            create: {
              title: pool.name,
              description,
              mintDate: null,
              mintPrice,
              supply: pool.pool_slots_count || null,
              imageUrl,
              websiteUrl: getDreamCastMintUrl(pool.slug),
              status: "LIVE",
              isApproved: true,
              isForeverMint: true,
              source: "DREAMBAY",
              externalId: `dreamcast-${pool.slug}`,
              createdById: user.id,
              metadata,
            },
            update: {
              title: pool.name,
              description,
              mintPrice,
              supply: pool.pool_slots_count || null,
              imageUrl,
              status: "LIVE",
              isForeverMint: true,
              metadata,
            },
          });

          if (result.createdAt === result.updatedAt) {
            dcCreated++;
          } else {
            dcUpdated++;
          }
        } catch (error) {
          console.error(`Failed to import DreamCast pool ${pool.name}:`, error);
          dcErrors.push(pool.name);
        }
      }
    } catch (error) {
      console.error("DreamCast fetch error:", error);
      dcErrors.push("API fetch failed");
    }

    const allErrors = [...errors, ...dcErrors];

    return NextResponse.json({
      created: created + dcCreated,
      updated: updated + dcUpdated,
      launchpads: { created, updated, total: activeLaunchpads.length },
      dreamcast: { created: dcCreated, updated: dcUpdated },
      errors: allErrors.length > 0 ? allErrors : undefined,
      message: `DreamBay: ${created} launchpads, ${dcCreated}+${dcUpdated} DreamCast pools.`,
    });
  } catch (error) {
    console.error("Sync DreamBay launchpads error:", error);
    return NextResponse.json(
      { error: "Failed to sync DreamBay launchpads" },
      { status: 500 }
    );
  }
}
