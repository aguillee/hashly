import { prisma } from "./db";

// Point values for different actions (for missions claim)
export const POINTS = {
  DAILY_LOGIN: 5,
  VOTE: 10,
  FIRST_VOTE_OF_DAY: 5,
  VOTE_5_EVENTS: 25,
  EVENT_APPROVED: 100,
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 300,
  SHARE_TWITTER: 15,
  REFERRAL: 50,
  TOP_10_MONTHLY: 200,
  // Achievements
  FIRST_VOTE: 20,
  FIRST_EVENT: 30,
  VOTES_100: 100,
  VOTES_500: 300,
  EVENTS_10: 500,
  TOP_1_MONTHLY: 500,
} as const;

export type PointAction = keyof typeof POINTS;

export async function addPoints(
  userId: string,
  action: PointAction,
  description?: string
): Promise<{ points: number; newTotal: number; levelUp: boolean }> {
  const points = POINTS[action];

  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("User not found");

  // Update user points and create history
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: points },
      },
    }),
    prisma.pointHistory.create({
      data: {
        userId,
        points,
        actionType: action,
        description,
      },
    }),
  ]);

  return {
    points,
    newTotal: updatedUser.points,
    levelUp: false,
  };
}

// Handle daily checkin with automatic points
export async function handleDailyCheckin(userId: string): Promise<{
  success: boolean;
  streak: number;
  alreadyCheckedIn: boolean;
  pointsEarned: number;
  newTotal: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("User not found");

  const now = new Date();
  const lastLogin = user.lastLogin;

  // Check if already logged in today
  if (lastLogin) {
    const lastLoginDate = new Date(lastLogin).toDateString();
    const todayDate = now.toDateString();
    if (lastLoginDate === todayDate) {
      return {
        success: true,
        streak: user.loginStreak,
        alreadyCheckedIn: true,
        pointsEarned: 0,
        newTotal: user.points,
      };
    }
  }

  // Calculate streak
  let newStreak = 1;
  if (lastLogin) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastLoginDate = new Date(lastLogin).toDateString();
    const yesterdayDate = yesterday.toDateString();

    if (lastLoginDate === yesterdayDate) {
      newStreak = user.loginStreak + 1;
    }
  }

  // Calculate streak bonus points (only for milestone streaks)
  let pointsEarned = 0;

  // Streak bonuses - only award points at milestones
  if (newStreak === 7) {
    pointsEarned = POINTS.STREAK_7_DAYS;
  } else if (newStreak === 30) {
    pointsEarned = POINTS.STREAK_30_DAYS;
  }

  // Update user - only add points if there's a streak bonus
  if (pointsEarned > 0) {
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          lastLogin: now,
          loginStreak: newStreak,
          points: { increment: pointsEarned },
        },
      }),
      prisma.pointHistory.create({
        data: {
          userId,
          points: pointsEarned,
          actionType: "STREAK_BONUS",
          description: `Streak bonus: ${newStreak} days!`,
        },
      }),
    ]);

    return {
      success: true,
      streak: newStreak,
      alreadyCheckedIn: false,
      pointsEarned,
      newTotal: updatedUser.points,
    };
  }

  // No points - just update login info
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLogin: now,
      loginStreak: newStreak,
    },
  });

  return {
    success: true,
    streak: newStreak,
    alreadyCheckedIn: false,
    pointsEarned: 0,
    newTotal: user.points,
  };
}

export async function getLeaderboard(limit: number = 10) {
  return prisma.user.findMany({
    select: {
      id: true,
      walletAddress: true,
      points: true,
    },
    orderBy: { points: "desc" },
    take: limit,
  });
}

export async function getUserRank(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  if (!user) return 0;

  const rank = await prisma.user.count({
    where: { points: { gt: user.points } },
  });

  return rank + 1;
}

