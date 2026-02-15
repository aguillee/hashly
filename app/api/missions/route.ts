import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { MISSION_DEFINITIONS } from "@/lib/missions";

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

    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress as string },
      include: {
        votes: true,
        events: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats (UTC)
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const todayVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfDay).length;
    const weekVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfWeek).length;
    const totalVotes = user.votes.length;
    const approvedEvents = user.events.filter(e => e.isApproved).length;

    // Get today's date string for sentiment votes (UTC)
    const todayDateStr = now.toISOString().split("T")[0];

    // Get collection votes count, sentiment votes, and user missions in parallel
    const [collectionVotesCount, todaySentimentVotes, totalSentimentDays, userMissions] = await Promise.all([
      prisma.collectionVote.count({
        where: { walletAddress: payload.walletAddress as string },
      }),
      // Count today's sentiment votes (max 3 categories)
      prisma.sentimentVote.count({
        where: {
          walletAddress: payload.walletAddress as string,
          date: todayDateStr,
        },
      }),
      // Count unique days with sentiment votes (for achievements)
      prisma.sentimentVote.groupBy({
        by: ["date"],
        where: { walletAddress: payload.walletAddress as string },
      }),
      prisma.userMission.findMany({
        where: { userId: user.id },
      }),
    ]);

    const sentimentDaysCount = totalSentimentDays.length;

    const stats = {
      totalVotes,
      totalEvents: approvedEvents,
      loginStreak: user.loginStreak,
      todayVotes,
      weekVotes,
      collectionVotes: collectionVotesCount,
      todaySentimentVotes,
      sentimentDaysCount,
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
        // Sentiment missions
        case "daily_sentiment":
          progress = Math.min(todaySentimentVotes, def.requirement);
          completed = todaySentimentVotes >= def.requirement;
          break;
        case "first_sentiment_vote":
          progress = sentimentDaysCount > 0 ? 1 : 0;
          completed = sentimentDaysCount > 0;
          break;
        case "sentiment_week_streak":
          // Check consecutive days - simplified: use sentimentDaysCount for now
          // TODO: implement proper streak counting if needed
          progress = Math.min(sentimentDaysCount, def.requirement);
          completed = sentimentDaysCount >= def.requirement;
          break;
        case "sentiment_votes_30":
          progress = Math.min(sentimentDaysCount, def.requirement);
          completed = sentimentDaysCount >= def.requirement;
          break;
        case "sentiment_votes_100":
          progress = Math.min(sentimentDaysCount, def.requirement);
          completed = sentimentDaysCount >= def.requirement;
          break;
      }

      // Check if already claimed in current period
      const userMission = userMissions.find(um => um.missionId === def.id);
      let claimed = false;
      if (userMission?.claimedAt) {
        if (def.type === "DAILY") {
          claimed = userMission.claimedAt >= startOfDay;
        } else if (def.type === "WEEKLY") {
          claimed = userMission.claimedAt >= startOfWeek;
        } else {
          claimed = true; // Achievements are claimed once
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
