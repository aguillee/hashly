import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLeaderboardWithBadges } from "@/lib/badge-points";
import { getCurrentSeason } from "@/lib/seasons";

export const dynamic = "force-dynamic";

// GET /api/v1/leaderboard — current season leaderboard.
// Reuses the same engine as the public web's /leaderboard page so the
// numbers always match.
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  const authFail = requireApiKey(request);
  if (authFail) return authFail;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100));

    const leaderboard = await getLeaderboardWithBadges(limit);
    const season = getCurrentSeason();

    return NextResponse.json({
      leaderboard: leaderboard.map((entry, i) => ({
        rank: i + 1,
        walletAddress: entry.walletAddress,
        alias: entry.alias,
        missionPoints: entry.missionPoints,
        badgePoints: entry.badgePoints,
        badgeCount: entry.badgeCount,
        referralPoints: entry.referralPoints,
        totalPoints: entry.totalPoints,
      })),
      season: {
        number: season.number,
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[v1/leaderboard] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
