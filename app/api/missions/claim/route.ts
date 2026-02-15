import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { awardMissionPoints } from "@/lib/points";
import { MISSION_DEFINITIONS } from "@/lib/missions";
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress as string },
      include: { votes: true, events: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify mission is actually completed before allowing claim
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const todayVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfDay).length;
    const weekVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfWeek).length;
    const totalVotes = user.votes.length;
    const approvedEvents = user.events.filter(e => e.isApproved).length;
    const hasLoggedInToday = user.lastLogin && new Date(user.lastLogin) >= startOfDay;

    // Get today's date string for sentiment votes (UTC)
    const todayDateStr = now.toISOString().split("T")[0];

    const [collectionVotesCount, todaySentimentVotes, totalSentimentDays] = await Promise.all([
      prisma.collectionVote.count({
        where: { walletAddress: payload.walletAddress as string },
      }),
      prisma.sentimentVote.count({
        where: {
          walletAddress: payload.walletAddress as string,
          date: todayDateStr,
        },
      }),
      prisma.sentimentVote.groupBy({
        by: ["date"],
        where: { walletAddress: payload.walletAddress as string },
      }),
    ]);

    const sentimentDaysCount = totalSentimentDays.length;

    let isCompleted = false;
    switch (missionId) {
      case "daily_login":
        isCompleted = !!hasLoggedInToday;
        break;
      case "daily_vote":
        isCompleted = todayVotes >= mission.requirement;
        break;
      case "vote_5_events":
        isCompleted = todayVotes >= mission.requirement;
        break;
      case "weekly_streak":
        isCompleted = user.loginStreak >= mission.requirement;
        break;
      case "weekly_votes":
        isCompleted = weekVotes >= mission.requirement;
        break;
      case "first_vote":
        isCompleted = totalVotes >= mission.requirement;
        break;
      case "first_event":
        isCompleted = approvedEvents >= mission.requirement;
        break;
      case "votes_100":
        isCompleted = totalVotes >= mission.requirement;
        break;
      case "votes_500":
        isCompleted = totalVotes >= mission.requirement;
        break;
      case "collection_votes_50":
        isCompleted = collectionVotesCount >= mission.requirement;
        break;
      case "collection_votes_100":
        isCompleted = collectionVotesCount >= mission.requirement;
        break;
      // Sentiment missions
      case "daily_sentiment":
        isCompleted = todaySentimentVotes >= mission.requirement;
        break;
      case "first_sentiment_vote":
        isCompleted = sentimentDaysCount > 0;
        break;
      case "sentiment_week_streak":
        isCompleted = sentimentDaysCount >= mission.requirement;
        break;
      case "sentiment_votes_30":
        isCompleted = sentimentDaysCount >= mission.requirement;
        break;
      case "sentiment_votes_100":
        isCompleted = sentimentDaysCount >= mission.requirement;
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
      `Mission: ${mission.name}`
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
