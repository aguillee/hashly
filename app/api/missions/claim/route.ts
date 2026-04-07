import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { awardMissionPoints } from "@/lib/points";
import { MISSION_DEFINITIONS } from "@/lib/missions";
import { getCurrentSeason } from "@/lib/seasons";
import { calculateBadgePoints } from "@/lib/badge-points";
import { z } from "zod";

const claimSchema = z.object({
  missionId: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const validation = claimSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { missionId } = validation.data;

    // Find mission definition
    const mission = MISSION_DEFINITIONS.find(m => m.id === missionId);
    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    const walletAddress = payload.walletAddress as string;

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify mission is actually completed before allowing claim
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const hasLoggedInToday = user.lastLogin && new Date(user.lastLogin) >= startOfDay;

    // Season boundary for achievement missions
    const currentSeason = getCurrentSeason();
    const seasonStart = currentSeason.startDate;

    // Count votes in parallel — season-scoped for achievements
    const [
      todayEventVotes,
      weekEventVotes,
      seasonEventVotes, seasonCollectionVotes, seasonTokenVotes,
      seasonApprovedEvents,
      seasonReferralCount,
      badgeData,
      communityProfile,
      seasonEcosystemVotes,
    ] = await Promise.all([
      // Today — events only (use PointHistory for accuracy)
      prisma.pointHistory.count({
        where: { userId: user.id, actionType: "VOTE", description: { startsWith: "Voted on event:" }, createdAt: { gte: startOfDay } },
      }),
      // Week — events only
      prisma.pointHistory.count({
        where: { userId: user.id, actionType: "VOTE", description: { startsWith: "Voted on event:" }, createdAt: { gte: startOfWeek } },
      }),
      // Season — all types (for achievement missions)
      prisma.pointHistory.count({ where: { userId: user.id, actionType: "VOTE", createdAt: { gte: seasonStart } } }),
      // Unique collection votes this season (from PointHistory — immune to recalculate cron)
      prisma.pointHistory.findMany({
        where: { userId: user.id, actionType: "COLLECTION_VOTE", createdAt: { gte: seasonStart }, description: { contains: "collection:" } },
        select: { description: true }, distinct: ["description"],
      }).then(r => r.length),
      // Unique token votes this season (from PointHistory)
      prisma.pointHistory.findMany({
        where: { userId: user.id, actionType: "TOKEN_VOTE", createdAt: { gte: seasonStart } },
        select: { description: true }, distinct: ["description"],
      }).then(r => r.length),
      // Approved events this season
      prisma.event.count({ where: { createdById: user.id, isApproved: true, createdAt: { gte: seasonStart } } }),
      // Activated referrals this season
      prisma.referral.count({ where: { referrerId: user.id, createdAt: { gte: seasonStart } } }),
      // Badges owned — on-chain verification, current season only
      calculateBadgePoints(walletAddress, seasonStart, currentSeason.endDate),
      // HashWorld profile
      prisma.communityProfile.findFirst({
        where: { userId: user.id, type: { not: "PROJECT" } },
        select: { id: true },
      }),
      // Unique ecosystem project votes this season
      // Unique ecosystem project votes this season (from PointHistory)
      prisma.pointHistory.findMany({
        where: { userId: user.id, createdAt: { gte: seasonStart }, OR: [
          { actionType: "ECOSYSTEM_VOTE" },
          { actionType: "COLLECTION_VOTE", description: { contains: "project:" } },
        ]},
        select: { description: true }, distinct: ["description"],
      }).then(r => r.length),
    ]);

    const seasonVotes = seasonEventVotes + seasonCollectionVotes + seasonTokenVotes;

    let isCompleted = false;
    switch (missionId) {
      case "daily_login":
        isCompleted = !!hasLoggedInToday;
        break;
      case "daily_vote":
        isCompleted = todayEventVotes >= mission.requirement;
        break;
      case "vote_5_events":
        isCompleted = todayEventVotes >= mission.requirement;
        break;
      case "weekly_streak":
        isCompleted = user.loginStreak >= mission.requirement;
        break;
      case "first_vote":
        isCompleted = seasonVotes >= mission.requirement;
        break;
      case "first_event":
        isCompleted = seasonApprovedEvents >= mission.requirement;
        break;
      case "season_streak_25":
        isCompleted = user.loginStreak >= mission.requirement;
        break;
      case "referral_1":
        isCompleted = seasonReferralCount >= mission.requirement;
        break;
      case "referral_3":
        isCompleted = seasonReferralCount >= mission.requirement;
        break;
      case "badge_1":
        isCompleted = badgeData.badgeCount >= mission.requirement;
        break;
      case "badge_3":
        isCompleted = badgeData.badgeCount >= mission.requirement;
        break;
      case "hashworld_profile":
        isCompleted = !!communityProfile;
        break;
      case "vote_5_collections":
        isCompleted = seasonCollectionVotes >= mission.requirement;
        break;
      case "vote_5_tokens":
        isCompleted = seasonTokenVotes >= mission.requirement;
        break;
      case "vote_5_ecosystem":
        isCompleted = seasonEcosystemVotes >= mission.requirement;
        break;
      case "event_creator_5":
        isCompleted = seasonApprovedEvents >= mission.requirement;
        break;
    }

    if (!isCompleted) {
      return NextResponse.json({ error: "Mission not completed" }, { status: 400 });
    }

    // Award points (with double-claim prevention inside transaction)
    const result = await awardMissionPoints(
      user.id,
      mission.pointsReward,
      missionId,
      mission.type,
      `Mission: ${mission.name}`,
      { permanent: mission.permanent }
    );

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      newTotal: result.newTotal,
    });
  } catch (error: any) {
    if (error?.message === "ALREADY_CLAIMED") {
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }
    console.error("Mission claim error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
