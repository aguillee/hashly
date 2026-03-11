import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const S1 = new Date("2026-03-01T00:00:00Z");

async function main() {
  const users = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    select: { id: true, alias: true, walletAddress: true, points: true, referralPoints: true },
    orderBy: { points: "desc" },
  });

  console.log("=== FULL POINTS AUDIT (Season 1) ===\n");
  for (const u of users) {
    const history = await prisma.pointHistory.findMany({
      where: { userId: u.id, createdAt: { gte: S1 } },
    });
    const historyTotal = history.reduce((sum, h) => sum + h.points, 0);
    const match = u.points === historyTotal;
    const label = u.alias || u.walletAddress;
    if (!match) {
      console.log(`⚠️  ${label} | stored: ${u.points} | S1 history: ${historyTotal} | diff: ${u.points - historyTotal} | refPts: ${u.referralPoints}`);
    } else {
      console.log(`✅ ${label} | ${u.points} pts (matches)`);
    }
  }

  // Also check referral counts for CarlosRevilla
  console.log("\n=== CARLOS REFERRAL DETAIL ===");
  const carlos = await prisma.user.findFirst({
    where: { alias: { contains: "CarlosRevilla", mode: "insensitive" } },
  });
  if (carlos) {
    const totalReferrals = await prisma.referral.count({ where: { referrerId: carlos.id } });
    const s0Referrals = await prisma.referral.count({
      where: { referrerId: carlos.id, createdAt: { lt: S1 } },
    });
    const s1Referrals = await prisma.referral.count({
      where: { referrerId: carlos.id, createdAt: { gte: S1 } },
    });
    console.log(`Total referrals: ${totalReferrals} (S0: ${s0Referrals}, S1: ${s1Referrals})`);
    console.log(`referralPoints stored: ${carlos.referralPoints}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
