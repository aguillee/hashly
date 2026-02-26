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

    // Count all vote types (events + collections + tokens) in parallel
    const [
      todayEventVotes, todayCollectionVotes, todayTokenVotes,
      weekEventVotes, weekCollectionVotes, weekTokenVotes,
      totalEventVotes, totalCollectionVotes, totalTokenVotes,
      approvedEvents, collectionVotesCount, userMissions,
    ] = await Promise.all([
      // Today
      prisma.vote.count({ where: { userId: user.id, createdAt: { gte: startOfDay } } }),
      prisma.collectionVote.count({ where: { walletAddress, updatedAt: { gte: startOfDay } } }),
      prisma.tokenVote.count({ where: { walletAddress, updatedAt: { gte: startOfDay } } }),
      // Week
      prisma.vote.count({ where: { userId: user.id, createdAt: { gte: startOfWeek } } }),
      prisma.collectionVote.count({ where: { walletAddress, updatedAt: { gte: startOfWeek } } }),
      prisma.tokenVote.count({ where: { walletAddress, updatedAt: { gte: startOfWeek } } }),
      // Total
      prisma.vote.count({ where: { userId: user.id } }),
      prisma.collectionVote.count({ where: { walletAddress } }),
      prisma.tokenVote.count({ where: { walletAddress } }),
      // Other
      prisma.event.count({ where: { createdById: user.id, isApproved: true } }),
      prisma.collectionVote.count({ where: { walletAddress } }),
      prisma.userMission.findMany({ where: { userId: user.id } }),
    ]);

    const todayVotes = todayEventVotes + todayCollectionVotes + todayTokenVotes;
    const weekVotes = weekEventVotes + weekCollectionVotes + weekTokenVotes;
    const totalVotes = totalEventVotes + totalCollectionVotes + totalTokenVotes;

    const stats = {
      totalVotes,
      totalEvents: approvedEvents,
      loginStreak: user.loginStreak,
      todayVotes,
      weekVotes,
      collectionVotes: collectionVotesCount,
    };

    // Check if user has logged in today
    const hasLoggedInToday = user.lastLogin && new Date(user.lastLogin) >= startOfDay;

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
          progress = Math.min(todayVotes, def.requirement);
          completed = todayVotes >= def.requirement;
          break;
        case "vote_5_events":
          progress = Math.min(todayVotes, def.requirement);
          completed = todayVotes >= def.requirement;
          break;
        case "weekly_streak":
          progress = Math.min(user.loginStreak, def.requirement);
          completed = user.loginStreak >= def.requirement;
          break;
        case "weekly_votes":
          progress = Math.min(weekVotes, def.requirement);
          completed = weekVotes >= def.requirement;
          break;
        case "first_vote":
          progress = Math.min(totalVotes, def.requirement);
          completed = totalVotes >= def.requirement;
          break;
        case "first_event":
          progress = Math.min(approvedEvents, def.requirement);
          completed = approvedEvents >= def.requirement;
          break;
        case "votes_100":
          progress = Math.min(totalVotes, def.requirement);
          completed = totalVotes >= def.requirement;
          break;
        case "votes_500":
          progress = Math.min(totalVotes, def.requirement);
          completed = totalVotes >= def.requirement;
          break;
        case "collection_votes_50":
          progress = Math.min(collectionVotesCount, def.requirement);
          completed = collectionVotesCount >= def.requirement;
          break;
        case "collection_votes_100":
          progress = Math.min(collectionVotesCount, def.requirement);
          completed = collectionVotesCount >= def.requirement;
          break;
      }

      // Check if already claimed in current period
      const userMission = userMissions.find(um => um.missionId === def.id);
      const currentSeason = getCurrentSeason();
      let claimed = false;
      if (userMission?.claimedAt) {
        if (def.type === "DAILY") {
          claimed = userMission.claimedAt >= startOfDay;
        } else if (def.type === "WEEKLY") {
          claimed = userMission.claimedAt >= startOfWeek;
        } else {
          // Achievements: claimed once per season (re-claimable each new season)
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
