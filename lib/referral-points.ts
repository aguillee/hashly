import { prisma } from "./db";
import { getCurrentSeason } from "./seasons";

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_LOCK_DAYS = 60;
const REFERRAL_SIGNUP_BONUS = 50;
const REFERRAL_REFERRER_BONUS = 50;
const REFERRAL_COMMISSION_RATE = 0.05; // 5%
const REFERRER_BONUS_THRESHOLD = 50; // referee must reach 50 mission points

// Referral-related action types that should NOT generate commission (avoid loops)
const REFERRAL_ACTION_TYPES = [
  "SIGNUP_BONUS",
  "REFERRER_BONUS",
  "COMMISSION",
  "REFERRAL",
];

/**
 * Generate a unique 8-char alphanumeric uppercase referral code
 */
export async function generateReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes ambiguous chars: 0,O,1,I
  let code: string;
  let exists: boolean;

  do {
    code = "";
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    exists = !!existing;
  } while (exists);

  return code;
}

export interface ApplyReferralResult {
  success: boolean;
  error?: string;
  referrerAlias?: string | null;
  pointsEarned?: number;
}

/**
 * Apply a referral code for a user (referee enters referrer's code)
 */
export async function applyReferralCode(
  refereeUserId: string,
  code: string
): Promise<ApplyReferralResult> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode || normalizedCode.length !== REFERRAL_CODE_LENGTH) {
    return { success: false, error: "Invalid referral code format" };
  }

  // Find the referrer by code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: normalizedCode },
    select: { id: true, alias: true, walletAddress: true },
  });

  if (!referrer) {
    return { success: false, error: "Referral code not found" };
  }

  // Get the referee
  const referee = await prisma.user.findUnique({
    where: { id: refereeUserId },
    select: {
      id: true,
      referredAt: true,
      referralCode: true,
      points: true,
      referredBy: {
        select: { id: true, referrerId: true },
      },
    },
  });

  if (!referee) {
    return { success: false, error: "User not found" };
  }

  // No self-referral
  if (referrer.id === referee.id) {
    return { success: false, error: "You cannot use your own referral code" };
  }

  // Check 60-day lock
  if (referee.referredAt) {
    const lockExpires = new Date(referee.referredAt);
    lockExpires.setDate(lockExpires.getDate() + REFERRAL_LOCK_DAYS);

    if (new Date() < lockExpires) {
      const daysLeft = Math.ceil(
        (lockExpires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        success: false,
        error: `You cannot change your referral code for ${daysLeft} more days`,
      };
    }

    // Lock expired — delete old referral (referrer keeps earned points)
    if (referee.referredBy) {
      await prisma.referral.delete({
        where: { id: referee.referredBy.id },
      });
    }
  }

  // Check not already referred by same person
  if (referee.referredBy && referee.referredBy.referrerId === referrer.id) {
    return { success: false, error: "You are already referred by this user" };
  }

  // Create referral and award signup bonus in a transaction
  await prisma.$transaction(async (tx) => {
    // Create referral record
    const referral = await tx.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: referee.id,
      },
    });

    // Award 50 pts to referee (instant)
    await tx.user.update({
      where: { id: referee.id },
      data: {
        referralPoints: { increment: REFERRAL_SIGNUP_BONUS },
        referredAt: new Date(),
      },
    });

    // Create earning record
    await tx.referralEarning.create({
      data: {
        referralId: referral.id,
        points: REFERRAL_SIGNUP_BONUS,
        sourceType: "SIGNUP_BONUS",
        description: `Signup bonus for using referral code ${normalizedCode}`,
      },
    });

    // Create point history for referee
    await tx.pointHistory.create({
      data: {
        userId: referee.id,
        points: REFERRAL_SIGNUP_BONUS,
        actionType: "REFERRAL",
        description: `Referral signup bonus (code: ${normalizedCode})`,
      },
    });

    // Check if referee already has enough mission points for referrer bonus
    if (referee.points >= REFERRER_BONUS_THRESHOLD) {
      await payReferrerBonus(tx, referral.id, referrer.id, referee.id);
    }
  });

  return {
    success: true,
    referrerAlias: referrer.alias,
    pointsEarned: REFERRAL_SIGNUP_BONUS,
  };
}

/**
 * Pay the 50pt referrer bonus (called when referee reaches threshold)
 */
async function payReferrerBonus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  referralId: string,
  referrerId: string,
  refereeId: string
) {
  // Mark as paid for this season
  const currentSeason = getCurrentSeason();
  await tx.referral.update({
    where: { id: referralId },
    data: {
      referrerBonusPaid: true,
      referrerBonusSeasonNumber: currentSeason.number,
    },
  });

  // Award points to referrer
  await tx.user.update({
    where: { id: referrerId },
    data: { referralPoints: { increment: REFERRAL_REFERRER_BONUS } },
  });

  // Get referee info for description
  const referee = await tx.user.findUnique({
    where: { id: refereeId },
    select: { walletAddress: true, alias: true },
  });

  const refereeName = referee?.alias || referee?.walletAddress || "unknown";

  // Create earning record
  await tx.referralEarning.create({
    data: {
      referralId,
      points: REFERRAL_REFERRER_BONUS,
      sourceType: "REFERRER_BONUS",
      description: `Referrer bonus: ${refereeName} reached ${REFERRER_BONUS_THRESHOLD} points`,
    },
  });

  // Create point history for referrer
  await tx.pointHistory.create({
    data: {
      userId: referrerId,
      points: REFERRAL_REFERRER_BONUS,
      actionType: "REFERRAL",
      description: `Referrer bonus: ${refereeName} reached ${REFERRER_BONUS_THRESHOLD} points`,
    },
  });
}

/**
 * Award 5% commission to the referrer when a referee earns points.
 * Call this after every point-awarding operation.
 * Fire-and-forget safe: errors are caught and logged.
 */
export async function awardReferralCommission(
  refereeUserId: string,
  pointsEarned: number,
  actionType: string
): Promise<void> {
  try {
    // Skip referral-related actions to avoid infinite loops
    if (REFERRAL_ACTION_TYPES.includes(actionType)) return;
    if (pointsEarned <= 0) return;

    // Calculate commission (floor to avoid fractions)
    const commission = Math.floor(pointsEarned * REFERRAL_COMMISSION_RATE);
    if (commission <= 0) return;

    // Find referral where this user is the referee
    const referral = await prisma.referral.findUnique({
      where: { refereeId: refereeUserId },
      select: {
        id: true,
        referrerId: true,
        referrerBonusPaid: true,
        referrerBonusSeasonNumber: true,
        referee: {
          select: { points: true, walletAddress: true, alias: true },
        },
      },
    });

    if (!referral) return;

    await prisma.$transaction(async (tx) => {
      // Award commission to referrer
      await tx.user.update({
        where: { id: referral.referrerId },
        data: { referralPoints: { increment: commission } },
      });

      const refereeName =
        referral.referee.alias || referral.referee.walletAddress;

      // Create earning record
      await tx.referralEarning.create({
        data: {
          referralId: referral.id,
          points: commission,
          sourceType: "COMMISSION",
          description: `5% commission: ${refereeName} earned ${pointsEarned} pts (${actionType})`,
        },
      });

      // Create point history for referrer
      await tx.pointHistory.create({
        data: {
          userId: referral.referrerId,
          points: commission,
          actionType: "REFERRAL",
          description: `Referral commission from ${refereeName} (${actionType})`,
        },
      });

      // Check and award referrer bonus if not yet paid this season and referee crossed threshold
      const currentSeason = getCurrentSeason();
      const bonusPaidThisSeason =
        referral.referrerBonusSeasonNumber != null &&
        referral.referrerBonusSeasonNumber >= currentSeason.number;

      if (!bonusPaidThisSeason) {
        // Re-fetch referee's current mission points (could have just been updated)
        const currentReferee = await tx.user.findUnique({
          where: { id: refereeUserId },
          select: { points: true },
        });

        if (
          currentReferee &&
          currentReferee.points >= REFERRER_BONUS_THRESHOLD
        ) {
          await payReferrerBonus(
            tx,
            referral.id,
            referral.referrerId,
            refereeUserId
          );
        }
      }
    });
  } catch (error) {
    // Fire-and-forget: log but don't throw
    console.error("[Referral Commission] Error:", error);
  }
}

export interface ReferralStats {
  referralCode: string | null;
  referredBy: {
    walletAddress: string;
    alias: string | null;
    referralCode: string | null;
  } | null;
  canChangeReferral: boolean;
  lockExpiresAt: string | null;
  daysUntilUnlock: number | null;
  referees: Array<{
    walletAddress: string;
    alias: string | null;
    theirTotalPoints: number;
    contributedPoints: number;
    bonusPaid: boolean;
    joinedAt: string;
  }>;
  totalReferralPoints: number;
  totalReferees: number;
}

/**
 * Get referral stats for a user's profile
 */
export async function getReferralStats(
  userId: string
): Promise<ReferralStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralPoints: true,
      referredAt: true,
      referredBy: {
        select: {
          referrer: {
            select: {
              walletAddress: true,
              alias: true,
              referralCode: true,
            },
          },
        },
      },
      referralsMade: {
        select: {
          id: true,
          referrerBonusPaid: true,
          referrerBonusSeasonNumber: true,
          createdAt: true,
          referee: {
            select: {
              walletAddress: true,
              alias: true,
              points: true,
              referralPoints: true,
            },
          },
          earnings: {
            where: { sourceType: { in: ["COMMISSION", "REFERRER_BONUS"] } },
            select: { points: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return {
      referralCode: null,
      referredBy: null,
      canChangeReferral: true,
      lockExpiresAt: null,
      daysUntilUnlock: null,
      referees: [],
      totalReferralPoints: 0,
      totalReferees: 0,
    };
  }

  // Calculate lock status
  let canChangeReferral = true;
  let lockExpiresAt: string | null = null;
  let daysUntilUnlock: number | null = null;

  if (user.referredAt) {
    const expires = new Date(user.referredAt);
    expires.setDate(expires.getDate() + REFERRAL_LOCK_DAYS);

    if (new Date() < expires) {
      canChangeReferral = false;
      lockExpiresAt = expires.toISOString();
      daysUntilUnlock = Math.ceil(
        (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  // Build referees list (badges excluded — commission only applies to missions + referrals)
  const currentSeason = getCurrentSeason();
  const referees = user.referralsMade.map((ref) => {
    const contributedPoints = ref.earnings.reduce(
      (sum, e) => sum + e.points,
      0
    );
    // bonusPaid reflects whether the bonus was paid THIS season
    const bonusPaidThisSeason =
      ref.referrerBonusSeasonNumber != null &&
      ref.referrerBonusSeasonNumber >= currentSeason.number;

    return {
      walletAddress: ref.referee.walletAddress,
      alias: ref.referee.alias,
      theirTotalPoints: ref.referee.points + ref.referee.referralPoints,
      contributedPoints,
      bonusPaid: bonusPaidThisSeason,
      joinedAt: ref.createdAt.toISOString(),
    };
  });

  return {
    referralCode: user.referralCode,
    referredBy: user.referredBy
      ? {
          walletAddress: user.referredBy.referrer.walletAddress,
          alias: user.referredBy.referrer.alias,
          referralCode: user.referredBy.referrer.referralCode,
        }
      : null,
    canChangeReferral,
    lockExpiresAt,
    daysUntilUnlock,
    referees,
    totalReferralPoints: user.referralPoints,
    totalReferees: user.referralsMade.length,
  };
}
