import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getUserRank } from "@/lib/points";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Total registered users
    const totalUsers = await prisma.user.count();

    return NextResponse.json({
      leaderboard: leaderboard.map((u, index) => ({
        rank: index + 1,
        walletAddress: u.walletAddress,
        alias: u.alias || null,
        points: u.points,
      })),
      userRank,
      totalUsers,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
