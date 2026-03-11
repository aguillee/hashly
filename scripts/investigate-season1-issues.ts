/**
 * Investigate Season 1 issues:
 * 1. Weekly mission claims that shouldn't exist (bad reset)
 * 2. CarlosRevilla referral situation
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEASON_1_START = new Date("2026-03-01T00:00:00Z");

async function main() {
  console.log("=== SEASON 1 INVESTIGATION ===\n");

  // 1. Weekly mission claims in Season 1
  console.log("--- WEEKLY MISSION CLAIMS IN SEASON 1 ---");
  const weeklyClaims = await prisma.userMission.findMany({
    where: {
      missionId: { in: ["weekly_streak", "weekly_votes"] },
      claimedAt: { gte: SEASON_1_START },
    },
    include: {
      user: { select: { id: true, walletAddress: true, alias: true, points: true } },
    },
  });

  if (weeklyClaims.length === 0) {
    console.log("No weekly mission claims found in Season 1\n");
  } else {
    console.log(`Found ${weeklyClaims.length} weekly claims:`);
    for (const claim of weeklyClaims) {
      console.log(`  - ${claim.user.alias || claim.user.walletAddress} | mission: ${claim.missionId} | claimedAt: ${claim.claimedAt} | currentPoints: ${claim.user.points}`);
    }
    console.log();
  }

  // Find corresponding PointHistory entries
  const weeklyPointHistory = await prisma.pointHistory.findMany({
    where: {
      createdAt: { gte: SEASON_1_START },
      actionType: "MISSION_CLAIM",
      description: { in: ["Mission: Dedicated User", "Mission: Super Voter"] },
    },
    include: {
      user: { select: { id: true, walletAddress: true, alias: true } },
    },
  });

  console.log(`Point history entries for weekly missions in S1: ${weeklyPointHistory.length}`);
  for (const ph of weeklyPointHistory) {
    console.log(`  - ${ph.user.alias || ph.user.walletAddress} | +${ph.points} pts | ${ph.description} | ${ph.createdAt}`);
  }
  console.log();

  // 2. CarlosRevilla referral situation
  console.log("--- CARLOSREVILLA REFERRAL SITUATION ---");
  const carlos = await prisma.user.findFirst({
    where: { alias: { contains: "CarlosRevilla", mode: "insensitive" } },
    select: {
      id: true,
      walletAddress: true,
      alias: true,
      points: true,
      referralPoints: true,
      referralCode: true,
    },
  });

  if (!carlos) {
    console.log("CarlosRevilla not found!\n");
  } else {
    console.log(`User: ${carlos.alias} (${carlos.walletAddress})`);
    console.log(`  Points: ${carlos.points} | Referral Points: ${carlos.referralPoints}`);
    console.log(`  Referral Code: ${carlos.referralCode}`);

    // Count referrals
    const allReferrals = await prisma.referral.findMany({
      where: { referrerId: carlos.id },
      include: {
        referee: { select: { id: true, alias: true, walletAddress: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const season0Referrals = allReferrals.filter(r => r.createdAt < SEASON_1_START);
    const season1Referrals = allReferrals.filter(r => r.createdAt >= SEASON_1_START);

    console.log(`\n  Total referrals: ${allReferrals.length}`);
    console.log(`  Season 0 referrals: ${season0Referrals.length}`);
    console.log(`  Season 1 referrals: ${season1Referrals.length}`);

    // Check referral earnings in Season 1
    const season1Earnings = await prisma.referralEarning.findMany({
      where: {
        referral: { referrerId: carlos.id },
        createdAt: { gte: SEASON_1_START },
      },
      orderBy: { createdAt: "asc" },
    });

    const season1EarningTotal = season1Earnings.reduce((sum, e) => sum + e.points, 0);
    console.log(`\n  Season 1 referral earnings: ${season1Earnings.length} entries, total ${season1EarningTotal} pts`);

    // Also check PointHistory for referral-related entries in S1
    const referralPointHistory = await prisma.pointHistory.findMany({
      where: {
        userId: carlos.id,
        createdAt: { gte: SEASON_1_START },
        actionType: { in: ["REFERRAL_COMMISSION", "REFERRER_BONUS", "REFERRAL"] },
      },
      orderBy: { createdAt: "asc" },
    });

    const referralPHTotal = referralPointHistory.reduce((sum, e) => sum + e.points, 0);
    console.log(`  Season 1 referral PointHistory: ${referralPointHistory.length} entries, total ${referralPHTotal} pts`);

    // Check all PointHistory (all types) for S1
    const allPH = await prisma.pointHistory.findMany({
      where: {
        userId: carlos.id,
        createdAt: { gte: SEASON_1_START },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\n  All Season 1 PointHistory for Carlos:`);
    for (const ph of allPH) {
      console.log(`    ${ph.actionType} | +${ph.points} | ${ph.description || "-"} | ${ph.createdAt}`);
    }
  }

  // 3. Check ALL users' referralPoints vs actual season 1 referral earnings
  console.log("\n--- ALL USERS WITH REFERRAL POINTS > 0 ---");
  const usersWithRefPoints = await prisma.user.findMany({
    where: { referralPoints: { gt: 0 } },
    select: { id: true, alias: true, walletAddress: true, referralPoints: true, points: true },
    orderBy: { referralPoints: "desc" },
  });

  for (const u of usersWithRefPoints) {
    // Check actual S1 referral earnings
    const actualEarnings = await prisma.pointHistory.findMany({
      where: {
        userId: u.id,
        createdAt: { gte: SEASON_1_START },
        actionType: { in: ["REFERRAL_COMMISSION", "REFERRER_BONUS", "REFERRAL"] },
      },
    });
    const actualTotal = actualEarnings.reduce((sum, e) => sum + e.points, 0);

    if (u.referralPoints !== actualTotal) {
      console.log(`  ⚠️ ${u.alias || u.walletAddress} | stored: ${u.referralPoints} | actual S1: ${actualTotal} | diff: ${u.referralPoints - actualTotal}`);
    } else {
      console.log(`  ✅ ${u.alias || u.walletAddress} | referralPoints: ${u.referralPoints} (matches S1 history)`);
    }
  }

  console.log("\n=== DONE ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
