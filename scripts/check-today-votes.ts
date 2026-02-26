import { prisma } from "../lib/db";

async function main() {
  const userId = "cml00jdo10000s0l22yjwvw6g";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Get today's individual event votes
  const todayEventVotes = await prisma.vote.findMany({
    where: { userId, createdAt: { gte: startOfDay } },
    include: { event: { select: { title: true, isForeverMint: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Event votes today (${todayEventVotes.length}):`);
  todayEventVotes.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.event.title} | ${v.voteType} | forever=${v.event.isForeverMint} | ${v.createdAt.toISOString()}`);
  });

  // Check DailyVoteLimit history
  const limits = await prisma.dailyVoteLimit.findMany({
    where: { walletAddress: user.walletAddress },
    orderBy: { date: "desc" },
    take: 5,
  });

  console.log("\nDailyVoteLimit records:");
  limits.forEach(l => {
    console.log(`  ${l.date}: ${l.voteCount} votes`);
  });

  // Count unique events voted today
  const uniqueEvents = new Set(todayEventVotes.map(v => v.eventId));
  console.log(`\nUnique events voted today: ${uniqueEvents.size}`);
  console.log(`Total vote records updated today: ${todayEventVotes.length}`);
}

main().then(() => prisma.$disconnect());
