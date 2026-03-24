import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { MISSION_DEFINITIONS } from "@/lib/missions";
import { getCurrentSeason } from "@/lib/seasons";
import { calculateBadgePoints } from "@/lib/badge-points";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "public");
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const walletAddress = payload.walletAddress as string;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats (UTC)
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    // Season boundary for achievement missions
    const currentSeason = getCurrentSeason();
    const seasonStart = currentSeason.startDate;

    // Count votes in parallel — use PointHistory for accurate event vote action counts
    const [
      todayEventVotes,
      weekEventVotes,
      // Season-scoped counts (for achievement missions)
      seasonEventVotes, seasonCollectionVotes, seasonTokenVotes,
      seasonApprovedEvents,
      seasonReferralCount,
      badgeData,
      communityProfile,
      userMissions,
    ] = await Promise.all([
      // Today — event vote actions from PointHistory (counts re-votes too)
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "VOTE",
          description: { startsWith: "Voted on event:" },
          createdAt: { gte: startOfDay },
        },
      }),
      // Week — event vote actions from PointHistory
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "VOTE",
          description: { startsWith: "Voted on event:" },
          createdAt: { gte: startOfWeek },
        },
      }),
      // Season — all types (for first_vote, votes_100, votes_500)
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "VOTE",
          createdAt: { gte: seasonStart },
        },
      }),
      prisma.collectionVote.count({ where: { walletAddress, createdAt: { gte: seasonStart } } }),
      prisma.tokenVote.count({ where: { walletAddress, createdAt: { gte: seasonStart } } }),
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
      // User missions
      prisma.userMission.findMany({ where: { userId: user.id } }),
    ]);

    const seasonVotes = seasonEventVotes + seasonCollectionVotes + seasonTokenVotes;

    // Check if user has logged in today
    const hasLoggedInToday = user.lastLogin && new Date(user.lastLogin) >= startOfDay;

    const stats = {
      totalVotes: weekEventVotes,
      seasonVotes,
      totalEvents: seasonApprovedEvents,
      loginStreak: user.loginStreak,
      todayVotes: todayEventVotes,
      weekVotes: weekEventVotes,
    };

    // Build missions with progress and claim status
    const missions = MISSION_DEFINITIONS.map(def => {
      let progress = 0;
      let completed = false;

      switch (def.id) {
        case "daily_login":
          progress = hasLoggedInToday ? 1 : 0;
          completed = hasLoggedInToday || false;
          break;
        case "daily_vote":
          progress = Math.min(todayEventVotes, def.requirement);
          completed = todayEventVotes >= def.requirement;
          break;
        case "vote_5_events":
          progress = Math.min(todayEventVotes, def.requirement);
          completed = todayEventVotes >= def.requirement;
          break;
        case "weekly_streak":
          progress = Math.min(user.loginStreak, def.requirement);
          completed = user.loginStreak >= def.requirement;
          break;
        case "first_vote":
          progress = Math.min(seasonVotes, def.requirement);
          completed = seasonVotes >= def.requirement;
          break;
        case "first_event":
          progress = Math.min(seasonApprovedEvents, def.requirement);
          completed = seasonApprovedEvents >= def.requirement;
          break;
        case "season_streak_25":
          progress = Math.min(user.loginStreak, def.requirement);
          completed = user.loginStreak >= def.requirement;
          break;
        case "referral_1":
          progress = Math.min(seasonReferralCount, def.requirement);
          completed = seasonReferralCount >= def.requirement;
          break;
        case "referral_3":
          progress = Math.min(seasonReferralCount, def.requirement);
          completed = seasonReferralCount >= def.requirement;
          break;
        case "badge_1":
          progress = Math.min(badgeData.badgeCount, def.requirement);
          completed = badgeData.badgeCount >= def.requirement;
          break;
        case "badge_3":
          progress = Math.min(badgeData.badgeCount, def.requirement);
          completed = badgeData.badgeCount >= def.requirement;
          break;
        case "hashworld_profile":
          progress = communityProfile ? 1 : 0;
          completed = !!communityProfile;
          break;
      }

      // Check if already claimed in current period
      const userMission = userMissions.find(um => um.missionId === def.id);
      let claimed = false;
      if (userMission?.claimedAt) {
        if (def.permanent) {
          // Permanent missions: claimed once ever
          claimed = true;
        } else if (def.type === "DAILY") {
          claimed = userMission.claimedAt >= startOfDay;
        } else if (def.type === "WEEKLY") {
          claimed = userMission.claimedAt >= startOfWeek;
        } else {
          // Season achievements: claimed once per season
          claimed = userMission.claimedAt >= currentSeason.startDate;
        }
      }

      return {
        ...def,
        progress,
        completed,
        claimed,
      };
    });

    return NextResponse.json({ missions, stats });
  } catch (error) {
    console.error("Failed to get missions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
