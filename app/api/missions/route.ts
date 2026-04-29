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
      seasonApprovedEcosystemProjects,
      seasonReferralCount,
      badgeData,
      seasonEcosystemVotes,
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
      // Approved events this season — counted via PointHistory so the rule is
      // "approved within the current season" (regardless of when the event was
      // submitted) and survives hard-deletes (the points stay even if the
      // event row is later removed by an admin).
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "EVENT_APPROVED",
          createdAt: { gte: seasonStart },
        },
      }),
      // Approved ecosystem projects this season — counted via PointHistory so it follows the
      // same season scoping as everything else and survives backfills.
      prisma.pointHistory.count({
        where: {
          userId: user.id,
          actionType: "ECOSYSTEM_PROJECT_APPROVED",
          createdAt: { gte: seasonStart },
        },
      }),
      // Activated referrals this season
      prisma.referral.count({ where: { referrerId: user.id, createdAt: { gte: seasonStart } } }),
      // Badges owned — on-chain verification, current season only
      calculateBadgePoints(walletAddress, seasonStart, currentSeason.endDate),
      // Unique ecosystem project votes this season (from PointHistory)
      prisma.pointHistory.findMany({
        where: { userId: user.id, createdAt: { gte: seasonStart }, OR: [
          { actionType: "ECOSYSTEM_VOTE" },
          { actionType: "COLLECTION_VOTE", description: { contains: "project:" } },
        ]},
        select: { description: true }, distinct: ["description"],
      }).then(r => r.length),
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
        case "event_creator_5":
          progress = Math.min(seasonApprovedEvents, def.requirement);
          completed = seasonApprovedEvents >= def.requirement;
          break;
        case "ecosystem_project_approved":
          progress = Math.min(seasonApprovedEcosystemProjects, def.requirement);
          completed = seasonApprovedEcosystemProjects >= def.requirement;
          break;
        case "vote_5_collections":
          progress = Math.min(seasonCollectionVotes, def.requirement);
          completed = seasonCollectionVotes >= def.requirement;
          break;
        case "vote_5_tokens":
          progress = Math.min(seasonTokenVotes, def.requirement);
          completed = seasonTokenVotes >= def.requirement;
          break;
        case "vote_5_ecosystem":
          progress = Math.min(seasonEcosystemVotes, def.requirement);
          completed = seasonEcosystemVotes >= def.requirement;
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
