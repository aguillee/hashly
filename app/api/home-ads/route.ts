import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/home-ads - Public: get active ads for homepage carousel
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const ads = await prisma.homeAd.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            mintDate: true,
            status: true,
            votesUp: true,
            event_type: true,
          },
        },
      },
    });

    // Filter out EVENT ads where event was deleted
    const validAds = ads.filter((ad) => {
      if (ad.type === "EVENT" && !ad.event) return false;
      return true;
    });

    return NextResponse.json({ ads: validAds });
  } catch (error) {
    console.error("Failed to fetch home ads:", error);
    return NextResponse.json({ error: "Failed to fetch home ads" }, { status: 500 });
  }
}
