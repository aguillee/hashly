import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentSeason } from "@/lib/seasons";

export const dynamic = "force-dynamic";

/**
 * GET /api/seasons/history
 * Returns past season snapshots for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshots = await prisma.seasonSnapshot.findMany({
      where: { userId: user.id },
      include: {
        season: {
          select: {
            number: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { season: { number: "desc" } },
    });

    const currentSeason = getCurrentSeason();

    return NextResponse.json({
      currentSeason: {
        number: currentSeason.number,
        name: currentSeason.name,
        startDate: currentSeason.startDate.toISOString(),
        endDate: currentSeason.endDate.toISOString(),
      },
      pastSeasons: snapshots.map((s) => ({
        seasonNumber: s.season.number,
        seasonName: `Season ${s.season.number}`,
        startDate: s.season.startDate.toISOString(),
        endDate: s.season.endDate.toISOString(),
        missionPoints: s.missionPoints,
        badgePoints: s.badgePoints,
        referralPoints: s.referralPoints,
        totalPoints: s.totalPoints,
        rank: s.rank,
      })),
    });
  } catch (error) {
    console.error("Failed to get season history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
