import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { getBadgePointsForWallets } from "@/lib/badge-points";
import { getCurrentSeason } from "@/lib/seasons";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get badge points from blockchain (filtered by current season)
    const season = getCurrentSeason();
    const badgeData = await getBadgePointsForWallets(
      [user.walletAddress],
      season.startDate,
      season.endDate
    );
    const badgeInfo = badgeData.get(user.walletAddress) || { badgePoints: 0, badgeCount: 0 };

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        alias: user.alias,
        points: user.points,
        badgePoints: badgeInfo.badgePoints,
        badgeCount: badgeInfo.badgeCount,
        referralPoints: user.referralPoints,
        totalPoints: user.points + badgeInfo.badgePoints + user.referralPoints,
        loginStreak: user.loginStreak,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
