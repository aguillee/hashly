import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchDreamBayLaunchpads, getDreamBayMintPrice } from "@/lib/dreambay";

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
            discordUrl: lp.socials.discord
              ? lp.socials.discord.startsWith("http")
                ? lp.socials.discord
                : `https://${lp.socials.discord}`
              : null,
            status: "LIVE",
            isApproved: true,
            isForeverMint: false,
            source: "DREAMBAY",
            externalId: lp.slug,
            createdById: user.id,
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
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`Failed to import DreamBay launchpad ${lp.name}:`, error);
        errors.push(lp.name);
      }
    }

    return NextResponse.json({
      created,
      updated,
      totalFromApi: activeLaunchpads.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `DreamBay: ${created} new, ${updated} updated from ${activeLaunchpads.length} active launchpads.`,
    });
  } catch (error) {
    console.error("Sync DreamBay launchpads error:", error);
    return NextResponse.json(
      { error: "Failed to sync DreamBay launchpads" },
      { status: 500 }
    );
  }
}
