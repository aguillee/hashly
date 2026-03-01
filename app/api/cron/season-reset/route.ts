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

    // If running late (after season boundary), calculate points earned in the
    // NEW season so we can preserve them and only snapshot the previous season.
    const seasonBoundary = previousSeason.endDate; // e.g. Mar 1 00:00 UTC
    const newSeasonPoints: Map<string, number> = new Map();

    const now = new Date();
    if (now > seasonBoundary) {
      console.log(
        `[Season Reset] Running late (${now.toISOString()} > ${seasonBoundary.toISOString()}), calculating new season points to preserve`
      );

      const pointsAfterBoundary = await prisma.pointHistory.groupBy({
        by: ["userId"],
        _sum: { points: true },
        where: {
          createdAt: { gte: seasonBoundary },
        },
      });

      for (const entry of pointsAfterBoundary) {
        newSeasonPoints.set(entry.userId, entry._sum.points || 0);
      }

      if (newSeasonPoints.size > 0) {
        console.log(
          `[Season Reset] ${newSeasonPoints.size} users earned points in new season, will preserve them`
        );
      }
    }

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

    // Build snapshot data — subtract new season points from current totals
    const snapshotData = allUsers
      .map((user) => {
        const badge = badgePointsMap.get(user.walletAddress) || {
          badgePoints: 0,
        };
        const newPts = newSeasonPoints.get(user.id) || 0;
        const seasonMissionPoints = Math.max(0, user.points - newPts);
        const totalPoints =
          seasonMissionPoints + badge.badgePoints + user.referralPoints;
        return {
          userId: user.id,
          missionPoints: seasonMissionPoints,
          badgePoints: badge.badgePoints,
          referralPoints: user.referralPoints,
          totalPoints,
          newSeasonPoints: newPts,
        };
      })
      .filter((s) => s.totalPoints > 0);

    // Sort by totalPoints descending for ranking
    snapshotData.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log(
      `[Season Reset] Creating snapshots for ${snapshotData.length} users with points > 0`
    );

    // Build a map of new season points per user for the reset step
    const newSeasonPointsById = new Map(
      snapshotData.map((s) => [s.userId, s.newSeasonPoints])
    );

    // Create Season + Snapshots + Reset points in a transaction
    await prisma.$transaction(
      async (tx) => {
        // 1. Create the Season record
        const season = await tx.season.create({
          data: {
            number: previousSeasonNumber,
            startDate: previousSeason.startDate,
            endDate: previousSeason.endDate,
          },
        });

        // 2. Create all snapshots in one batch
        await tx.seasonSnapshot.createMany({
          data: snapshotData.map((s, i) => ({
            userId: s.userId,
            seasonId: season.id,
            missionPoints: s.missionPoints,
            badgePoints: s.badgePoints,
            referralPoints: s.referralPoints,
            totalPoints: s.totalPoints,
            rank: i + 1,
          })),
        });

        // 3. Reset points — preserve any earned in the new season
        await tx.user.updateMany({
          data: {
            points: 0,
            referralPoints: 0,
          },
        });

        // Restore new season points for users who earned them today
        const entries = Array.from(newSeasonPoints.entries());
        for (const entry of entries) {
          if (entry[1] > 0) {
            await tx.user.update({
              where: { id: entry[0] },
              data: { points: entry[1] },
            });
          }
        }
      },
      { timeout: 60000 }
    );

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
