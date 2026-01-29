import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getUserRank } from "@/lib/points";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const leaderboard = await getLeaderboard(limit);

    // Get current user's rank if authenticated
    const user = await getCurrentUser();
    let userRank: number | null = null;

    if (user) {
      userRank = await getUserRank(user.id);
    }

    return NextResponse.json({
      leaderboard: leaderboard.map((u, index) => ({
        rank: index + 1,
        walletAddress: u.walletAddress,
        points: u.points,
      })),
      userRank,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
