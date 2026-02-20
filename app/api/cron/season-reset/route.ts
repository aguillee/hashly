import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSeason, getSeasonByNumber } from "@/lib/seasons";
import { getBadgePointsForWallets } from "@/lib/badge-points";

export const maxDuration = 300; // 5 minutes

/**
 * Season Reset Cron Job
 *
 * Should run on the 1st of each month at ~00:05 UTC.
 * 1. Snapshots the previous season's points for all users
 * 2. Resets user.points and user.referralPoints to 0
 * 3. Creates a Season record for the archived season
 *
 * Idempotent: if the Season record already exists, it skips.
 *
 * Local trigger: curl http://localhost:3000/api/cron/season-reset
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: in dev no restriction, in prod check CRON_SECRET
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const authHeader = request.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const currentSeason = getCurrentSeason();
    const previousSeasonNumber = currentSeason.number - 1;

    if (previousSeasonNumber < 0) {
      return NextResponse.json({
        message: "No previous season to snapshot (pre-Season 0)",
        skipped: true,
      });
    }

    // Check if snapshot already exists (idempotent)
    const existingSeason = await prisma.season.findUnique({
      where: { number: previousSeasonNumber },
    });

    if (existingSeason) {
      return NextResponse.json({
        message: `Season ${previousSeasonNumber} already archived`,
        skipped: true,
      });
    }

    const previousSeason = getSeasonByNumber(previousSeasonNumber);

    console.log(
      `[Season Reset] Archiving Season ${previousSeasonNumber} (${previousSeason.startDate.toISOString()} → ${previousSeason.endDate.toISOString()})`
    );

    // Get ALL users with any points (mission or referral)
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [{ points: { gt: 0 } }, { referralPoints: { gt: 0 } }],
      },
      select: {
        id: true,
        walletAddress: true,
        points: true,
        referralPoints: true,
      },
    });

    console.log(`[Season Reset] Found ${allUsers.length} users with points`);

    // Calculate badge points for the ending season
    const walletAddresses = allUsers.map((u) => u.walletAddress);
    const badgePointsMap =
      walletAddresses.length > 0
        ? await getBadgePointsForWallets(
            walletAddresses,
            previousSeason.startDate,
            previousSeason.endDate
          )
        : new Map();

    // Build snapshot data
    const snapshotData = allUsers
      .map((user) => {
        const badge = badgePointsMap.get(user.walletAddress) || {
          badgePoints: 0,
        };
        const totalPoints =
          user.points + badge.badgePoints + user.referralPoints;
        return {
          userId: user.id,
          missionPoints: user.points,
          badgePoints: badge.badgePoints,
          referralPoints: user.referralPoints,
          totalPoints,
        };
      })
      .filter((s) => s.totalPoints > 0);

    // Sort by totalPoints descending for ranking
    snapshotData.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log(
      `[Season Reset] Creating snapshots for ${snapshotData.length} users with points > 0`
    );

    // Create Season + Snapshots + Reset points in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create the Season record
      const season = await tx.season.create({
        data: {
          number: previousSeasonNumber,
          startDate: previousSeason.startDate,
          endDate: previousSeason.endDate,
        },
      });

      // 2. Create snapshots with rank (batch in chunks of 50)
      for (let i = 0; i < snapshotData.length; i++) {
        const s = snapshotData[i];
        await tx.seasonSnapshot.create({
          data: {
            userId: s.userId,
            seasonId: season.id,
            missionPoints: s.missionPoints,
            badgePoints: s.badgePoints,
            referralPoints: s.referralPoints,
            totalPoints: s.totalPoints,
            rank: i + 1,
          },
        });
      }

      // 3. Reset ALL users' season points
      await tx.user.updateMany({
        data: {
          points: 0,
          referralPoints: 0,
        },
      });
    });

    console.log(
      `[Season Reset] Done! Season ${previousSeasonNumber} archived, all points reset.`
    );

    return NextResponse.json({
      success: true,
      season: previousSeasonNumber,
      seasonName: previousSeason.name,
      usersSnapshotted: snapshotData.length,
      topUsers: snapshotData.slice(0, 5).map((s, i) => ({
        rank: i + 1,
        totalPoints: s.totalPoints,
      })),
    });
  } catch (error) {
    console.error("[Season Reset] Error:", error);
    return NextResponse.json(
      { error: "Season reset failed" },
      { status: 500 }
    );
  }
}
