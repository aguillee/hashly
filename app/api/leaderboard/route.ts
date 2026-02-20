import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLeaderboardWithBadges, getBadgePointsForWallets } from "@/lib/badge-points";
import { getCurrentSeason } from "@/lib/seasons";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);

    // Get leaderboard with badge points
    const leaderboard = await getLeaderboardWithBadges(limit);

    // Get current user's rank if authenticated
    const user = await getCurrentUser();
    let userRank: number | null = null;
    let userData = null;

    const season = getCurrentSeason();

    if (user) {
      // Calculate user's total points including badges (filtered by current season)
      const badgeData = await getBadgePointsForWallets(
        [user.walletAddress],
        season.startDate,
        season.endDate
      );
      const userBadgeInfo = badgeData.get(user.walletAddress) || { badgePoints: 0, badgeCount: 0 };
      const totalPoints = user.points + userBadgeInfo.badgePoints + user.referralPoints;

      // Count users with more total points
      // This is approximate - for exact ranking we'd need to calculate all users' badge points
      const usersWithMorePoints = await prisma.user.count({
        where: { points: { gt: totalPoints } },
      });
      userRank = usersWithMorePoints + 1;

      userData = {
        missionPoints: user.points,
        badgePoints: userBadgeInfo.badgePoints,
        badgeCount: userBadgeInfo.badgeCount,
        referralPoints: user.referralPoints,
        totalPoints,
      };
    }

    // Total registered users
    const totalUsers = await prisma.user.count();

    return NextResponse.json({
      leaderboard: leaderboard.map((u, index) => ({
        rank: index + 1,
        walletAddress: u.walletAddress,
        alias: u.alias || null,
        missionPoints: u.missionPoints,
        badgePoints: u.badgePoints,
        badgeCount: u.badgeCount,
        referralPoints: u.referralPoints,
        totalPoints: u.totalPoints,
        // Keep 'points' for backward compatibility
        points: u.totalPoints,
      })),
      userRank,
      userData,
      totalUsers,
      season: {
        number: season.number,
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
