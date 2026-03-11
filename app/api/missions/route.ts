import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { MISSION_DEFINITIONS } from "@/lib/missions";
import { getCurrentSeason } from "@/lib/seasons";

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

    // Count votes in parallel — events separate from collections/tokens
    const [
      todayEventVotes,
      weekEventVotes,
      // Season-scoped counts (for achievement missions)
      seasonEventVotes, seasonCollectionVotes, seasonTokenVotes,
      seasonApprovedEvents,
      seasonReferralCount,
      badgeCount,
      communityProfile,
      userMissions,
    ] = await Promise.all([
      // Today — events only (for daily_vote, vote_5_events)
      prisma.vote.count({ where: { userId: user.id, createdAt: { gte: startOfDay } } }),
      // Week — events only (for weekly_votes)
      prisma.vote.count({ where: { userId: user.id, createdAt: { gte: startOfWeek } } }),
      // Season — all types (for first_vote, votes_100, votes_500)
      prisma.vote.count({ where: { userId: user.id, createdAt: { gte: seasonStart } } }),
      prisma.collectionVote.count({ where: { walletAddress, createdAt: { gte: seasonStart } } }),
      prisma.tokenVote.count({ where: { walletAddress, createdAt: { gte: seasonStart } } }),
      // Approved events this season
      prisma.event.count({ where: { createdById: user.id, isApproved: true, createdAt: { gte: seasonStart } } }),
      // Activated referrals this season
      prisma.referral.count({ where: { referrerId: user.id, createdAt: { gte: seasonStart } } }),
      // Badges owned (SENT or CLAIMED) — NFTs persist across seasons
      prisma.badgeClaim.count({
        where: {
          walletAddress,
          status: { in: ["SENT", "CLAIMED"] },
        },
      }),
      // HashWorld profile
      prisma.communityProfile.findUnique({
        where: { userId: user.id },
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
        case "weekly_votes":
          progress = Math.min(weekEventVotes, def.requirement);
          completed = weekEventVotes >= def.requirement;
          break;
        case "first_vote":
          progress = Math.min(seasonVotes, def.requirement);
          completed = seasonVotes >= def.requirement;
          break;
        case "first_event":
          progress = Math.min(seasonApprovedEvents, def.requirement);
          completed = seasonApprovedEvents >= def.requirement;
          break;
        case "votes_100":
          progress = Math.min(seasonVotes, def.requirement);
          completed = seasonVotes >= def.requirement;
          break;
        case "votes_500":
          progress = Math.min(seasonVotes, def.requirement);
          completed = seasonVotes >= def.requirement;
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
          progress = Math.min(badgeCount, def.requirement);
          completed = badgeCount >= def.requirement;
          break;
        case "badge_3":
          progress = Math.min(badgeCount, def.requirement);
          completed = badgeCount >= def.requirement;
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
