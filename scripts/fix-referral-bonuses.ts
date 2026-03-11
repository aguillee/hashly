/**
 * Audit and fix incorrectly paid referrer bonuses.
 *
 * The bug: referrer bonus (50 pts) was paid even when the referee
 * had < 50 mission points (user.points). This script:
 * 1. Finds all referrals where referrerBonusPaid = true
 * 2. Checks if the referee actually had >= 50 mission points
 * 3. If not, reverses the bonus: subtracts 50 from referrer's referralPoints,
 *    marks referral as unpaid, and logs the correction
 *
 * Run with: npx tsx scripts/fix-referral-bonuses.ts
 * Add --fix to actually apply changes (default is dry-run)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--fix");

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN (add --fix to apply)\n" : "🔧 FIXING MODE\n");

  // Find all referrals where bonus was paid
  const referrals = await prisma.referral.findMany({
    where: { referrerBonusPaid: true },
    include: {
      referee: { select: { id: true, walletAddress: true, alias: true, points: true } },
      referrer: { select: { id: true, walletAddress: true, alias: true, referralPoints: true } },
      earnings: {
        where: { sourceType: "REFERRER_BONUS" },
        select: { id: true, points: true, createdAt: true },
      },
    },
  });

  console.log(`Found ${referrals.length} referrals with bonus paid\n`);

  let fixCount = 0;
  let totalPointsToReverse = 0;

  for (const ref of referrals) {
    const refereeName = ref.referee.alias || ref.referee.walletAddress;
    const referrerName = ref.referrer.alias || ref.referrer.walletAddress;
    const refereeMissionPts = ref.referee.points;
    const bonusEarnings = ref.earnings.reduce((sum, e) => sum + e.points, 0);

    if (refereeMissionPts < 50) {
      fixCount++;
      totalPointsToReverse += bonusEarnings;

      console.log(`❌ INVALID BONUS:`);
      console.log(`   Referee: ${refereeName} (mission pts: ${refereeMissionPts})`);
      console.log(`   Referrer: ${referrerName} (referralPts: ${ref.referrer.referralPoints})`);
      console.log(`   Bonus paid: ${bonusEarnings} pts (${ref.earnings.length} earnings)`);
      console.log(`   Season: ${ref.referrerBonusSeasonNumber}`);

      if (!DRY_RUN) {
        await prisma.$transaction(async (tx) => {
          // Reverse referrer's points
          await tx.user.update({
            where: { id: ref.referrerId },
            data: { referralPoints: { decrement: bonusEarnings } },
          });

          // Mark referral as unpaid
          await tx.referral.update({
            where: { id: ref.id },
            data: {
              referrerBonusPaid: false,
              referrerBonusSeasonNumber: null,
            },
          });

          // Delete the invalid earning records
          for (const earning of ref.earnings) {
            await tx.referralEarning.delete({ where: { id: earning.id } });
          }

          // Log the correction in point history
          await tx.pointHistory.create({
            data: {
              userId: ref.referrerId,
              points: -bonusEarnings,
              actionType: "CORRECTION",
              description: `Reversed invalid referrer bonus: ${refereeName} had ${refereeMissionPts} mission pts (< 50 threshold)`,
            },
          });
        });
        console.log(`   ✅ Fixed: reversed ${bonusEarnings} pts\n`);
      } else {
        console.log(`   → Would reverse ${bonusEarnings} pts\n`);
      }
    } else {
      console.log(`✅ Valid: ${refereeName} → ${referrerName} (referee has ${refereeMissionPts} mission pts)`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total referrals checked: ${referrals.length}`);
  console.log(`Invalid bonuses: ${fixCount}`);
  console.log(`Points to reverse: ${totalPointsToReverse}`);
  if (DRY_RUN && fixCount > 0) {
    console.log(`\nRun with --fix to apply changes`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
