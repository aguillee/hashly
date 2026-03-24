import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/community/profiles - List all visible community profiles
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const profiles = await prisma.communityProfile.findMany({
      where: { isVisible: true, isApproved: true },
      select: {
        id: true,
        displayName: true,
        type: true,
        twitterHandle: true,
        countryCode: true,
        bio: true,
        avatarUrl: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by country for efficient globe rendering
    const byCountry: Record<
      string,
      typeof profiles
    > = {};

    for (const profile of profiles) {
      if (!byCountry[profile.countryCode]) {
        byCountry[profile.countryCode] = [];
      }
      byCountry[profile.countryCode].push(profile);
    }

    return NextResponse.json({
      profiles,
      byCountry,
      total: profiles.length,
    });
  } catch (error) {
    console.error("Failed to fetch community profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}
