import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Mission definitions - points are earned automatically when conditions are met
const MISSION_DEFINITIONS = [
  // Daily
  {
    id: "daily_login",
    name: "Daily Check-in",
    description: "Log in to the platform (+5 pts automatic)",
    pointsReward: 5,
    type: "DAILY" as const,
    requirement: 1,
    icon: "calendar",
  },
  {
    id: "daily_vote",
    name: "Cast a Vote",
    description: "Vote on at least 1 event (+10 pts per vote)",
    pointsReward: 10,
    type: "DAILY" as const,
    requirement: 1,
    icon: "vote",
  },
  {
    id: "vote_5_events",
    name: "Active Voter",
    description: "Vote on 5 different events today",
    pointsReward: 50,
    type: "DAILY" as const,
    requirement: 5,
    icon: "vote",
  },
  // Weekly
  {
    id: "weekly_streak",
    name: "Dedicated User",
    description: "Log in 7 days in a row (+50 pts bonus)",
    pointsReward: 50,
    type: "WEEKLY" as const,
    requirement: 7,
    icon: "flame",
  },
  {
    id: "weekly_votes",
    name: "Super Voter",
    description: "Vote on 20 events this week",
    pointsReward: 200,
    type: "WEEKLY" as const,
    requirement: 20,
    icon: "trophy",
  },
  // Achievements
  {
    id: "first_vote",
    name: "First Vote",
    description: "Cast your first vote",
    pointsReward: 10,
    type: "ACHIEVEMENT" as const,
    requirement: 1,
    icon: "target",
  },
  {
    id: "first_event",
    name: "Event Creator",
    description: "Submit your first approved event",
    pointsReward: 100,
    type: "ACHIEVEMENT" as const,
    requirement: 1,
    icon: "gift",
  },
  {
    id: "votes_100",
    name: "Voting Enthusiast",
    description: "Cast 100 votes total",
    pointsReward: 1000,
    type: "ACHIEVEMENT" as const,
    requirement: 100,
    icon: "trophy",
  },
  {
    id: "votes_500",
    name: "Voting Legend",
    description: "Cast 500 votes total",
    pointsReward: 5000,
    type: "ACHIEVEMENT" as const,
    requirement: 500,
    icon: "trophy",
  },
  // Collection voting achievements
  {
    id: "collection_votes_50",
    name: "Collection Explorer",
    description: "Vote on 50 different collections (+1 pt per vote)",
    pointsReward: 100,
    type: "ACHIEVEMENT" as const,
    requirement: 50,
    icon: "vote",
  },
  {
    id: "collection_votes_100",
    name: "Collection Master",
    description: "Vote on 100 different collections (+1 pt per vote)",
    pointsReward: 500,
    type: "ACHIEVEMENT" as const,
    requirement: 100,
    icon: "trophy",
  },
];

export async function GET() {
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

    // Calculate stats
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const todayVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfDay).length;
    const weekVotes = user.votes.filter(v => new Date(v.createdAt) >= startOfWeek).length;
    const totalVotes = user.votes.length;
    const approvedEvents = user.events.filter(e => e.isApproved).length;

    // Get collection votes count
    const collectionVotesCount = await prisma.collectionVote.count({
      where: { walletAddress: payload.walletAddress as string },
    });

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

    // Build missions with progress
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

      return {
        ...def,
        progress,
        completed,
      };
    });

    return NextResponse.json({ missions, stats });
  } catch (error) {
    console.error("Failed to get missions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
