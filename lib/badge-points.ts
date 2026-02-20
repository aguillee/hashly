import { prisma } from "./db";
import { checkNFTOwnership, getNFTHolders } from "./hedera-nft";
import { getCurrentSeason } from "./seasons";

const BADGE_POINTS_PER_EVENT = 100;

/**
 * Calculate badge points for a wallet
 * Each unique event with an attendance badge = 100 points
 * Having multiple NFTs from same event = still 100 points (not cumulative)
 * Blockchain is the source of truth: if the token exists and the wallet holds the NFT, it counts.
 */
export async function calculateBadgePoints(
  walletAddress: string,
  seasonStart?: Date,
  seasonEnd?: Date
): Promise<{
  badgePoints: number;
  badgeCount: number;
  badges: Array<{
    eventId: string;
    eventTitle: string;
    tokenId: string;
    badgeName: string;
  }>;
}> {
  // Build where clause — optionally filter by season (mintedAt range)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { tokenId: { not: null } };
  if (seasonStart && seasonEnd) {
    where.mintedAt = { gte: seasonStart, lt: seasonEnd };
  }

  // Get badges with a token on Hedera (blockchain is source of truth)
  const distributedBadges = await prisma.attendanceBadge.findMany({
    where,
    select: {
      id: true,
      eventId: true,
      tokenId: true,
      name: true,
    },
  });

  if (distributedBadges.length === 0) {
    return { badgePoints: 0, badgeCount: 0, badges: [] };
  }

  // Get event titles
  const eventIds = distributedBadges.map((b) => b.eventId);
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, title: true },
  });
  const eventsMap = new Map(events.map((e) => [e.id, e.title]));

  // Check which badges this wallet owns
  const ownedBadges: Array<{
    eventId: string;
    eventTitle: string;
    tokenId: string;
    badgeName: string;
  }> = [];

  for (const badge of distributedBadges) {
    if (!badge.tokenId) continue;

    const ownership = await checkNFTOwnership(badge.tokenId, walletAddress);

    if (ownership.owns) {
      ownedBadges.push({
        eventId: badge.eventId,
        eventTitle: eventsMap.get(badge.eventId) || "Unknown Event",
        tokenId: badge.tokenId,
        badgeName: badge.name,
      });
    }
  }

  return {
    badgePoints: ownedBadges.length * BADGE_POINTS_PER_EVENT,
    badgeCount: ownedBadges.length,
    badges: ownedBadges,
  };
}

/**
 * Get badge points for multiple wallets (verified from blockchain)
 * Uses Mirror Node API to check actual NFT ownership - never trusts DB claims
 * Blockchain is the source of truth: if the token exists and the wallet holds the NFT, it counts.
 * Strategy: fetch all holders per badge token (1 API call per badge),
 * then cross-reference with the wallet list
 */
export async function getBadgePointsForWallets(
  walletAddresses: string[],
  seasonStart?: Date,
  seasonEnd?: Date
): Promise<Map<string, { badgePoints: number; badgeCount: number }>> {
  const result = new Map<string, { badgePoints: number; badgeCount: number }>();

  // Initialize all wallets with 0
  for (const wallet of walletAddresses) {
    result.set(wallet, { badgePoints: 0, badgeCount: 0 });
  }

  // Build where clause — optionally filter by season (mintedAt range)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { tokenId: { not: null } };
  if (seasonStart && seasonEnd) {
    where.mintedAt = { gte: seasonStart, lt: seasonEnd };
  }

  // Get badges with a token on Hedera (blockchain is source of truth)
  const distributedBadges = await prisma.attendanceBadge.findMany({
    where,
    select: {
      id: true,
      tokenId: true,
    },
  });

  if (distributedBadges.length === 0) return result;

  // Create a Set for fast wallet lookup
  const walletSet = new Set(walletAddresses);

  // For each badge token, get ALL holders from blockchain (1 API call per badge)
  // Then cross-reference with our wallet list
  const walletBadgeCount = new Map<string, number>();

  for (const badge of distributedBadges) {
    if (!badge.tokenId) continue;

    try {
      const holders = await getNFTHolders(badge.tokenId);

      // Check which of our wallets hold this badge
      holders.forEach((_serials, accountId) => {
        if (walletSet.has(accountId)) {
          walletBadgeCount.set(
            accountId,
            (walletBadgeCount.get(accountId) || 0) + 1
          );
        }
      });
    } catch (error) {
      console.error(`Failed to get holders for badge token ${badge.tokenId}:`, error);
    }
  }

  // Calculate points from verified blockchain ownership
  walletBadgeCount.forEach((badgeCount, wallet) => {
    result.set(wallet, {
      badgePoints: badgeCount * BADGE_POINTS_PER_EVENT,
      badgeCount,
    });
  });

  return result;
}

/**
 * Detect badge NFTs in a wallet and sync with database claims.
 * Called on checkin to ensure badge ownership is always up to date.
 * Blockchain is the source of truth: checks all badges with a token on Hedera.
 * - If wallet holds a badge NFT but has no claim → creates CLAIMED claim
 * - If wallet has a SENT claim but no longer holds the NFT → marks as PENDING (transferred away)
 */
export async function detectBadgesForWallet(walletAddress: string) {
  // Get all badges with a token on Hedera (blockchain is source of truth)
  const distributedBadges = await prisma.attendanceBadge.findMany({
    where: {
      tokenId: { not: null },
    },
    select: {
      id: true,
      tokenId: true,
      eventId: true,
    },
  });

  if (distributedBadges.length === 0) return;

  // Get existing claims for this wallet
  const existingClaims = await prisma.badgeClaim.findMany({
    where: { walletAddress },
    select: {
      id: true,
      badgeId: true,
      status: true,
    },
  });
  const claimsByBadge = new Map(existingClaims.map((c) => [c.badgeId, c]));

  for (const badge of distributedBadges) {
    if (!badge.tokenId) continue;

    const ownership = await checkNFTOwnership(badge.tokenId, walletAddress);
    const existingClaim = claimsByBadge.get(badge.id);

    if (ownership.owns && !existingClaim) {
      // Wallet holds badge NFT but has no claim record → create CLAIMED
      try {
        await prisma.badgeClaim.create({
          data: {
            badgeId: badge.id,
            walletAddress,
            serialNumber: ownership.serials[0],
            status: "CLAIMED",
          },
        });
      } catch {
        // Unique constraint - claim already exists, ignore
      }
    } else if (
      ownership.owns &&
      existingClaim &&
      existingClaim.status === "SENT"
    ) {
      // Update to CLAIMED (user accepted the airdrop)
      await prisma.badgeClaim.update({
        where: { id: existingClaim.id },
        data: { status: "CLAIMED" },
      });
    }
  }
}

/**
 * Get leaderboard with badge points included
 */
export async function getLeaderboardWithBadges(limit: number = 50) {
  // Get top users by mission points (must have at least 1 mission point to qualify)
  const users = await prisma.user.findMany({
    where: { points: { gte: 1 } },
    select: {
      id: true,
      walletAddress: true,
      alias: true,
      points: true,
      referralPoints: true,
    },
    orderBy: { points: "desc" },
    take: limit * 2, // Get more to account for reordering
  });

  // Get badge points for all these wallets (filtered by current season)
  const season = getCurrentSeason();
  const walletAddresses = users.map((u) => u.walletAddress);
  const badgePointsMap = await getBadgePointsForWallets(
    walletAddresses,
    season.startDate,
    season.endDate
  );

  // Combine and sort
  const leaderboardData = users.map((user) => {
    const badgeData = badgePointsMap.get(user.walletAddress) || {
      badgePoints: 0,
      badgeCount: 0,
    };

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      alias: user.alias,
      missionPoints: user.points,
      badgePoints: badgeData.badgePoints,
      badgeCount: badgeData.badgeCount,
      referralPoints: user.referralPoints,
      totalPoints: user.points + badgeData.badgePoints + user.referralPoints,
    };
  });

  // Sort by total points
  leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

  // Return top N
  return leaderboardData.slice(0, limit);
}
