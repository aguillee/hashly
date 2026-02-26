import { prisma } from "../lib/db";

async function main() {
  const walletAddress = "0.0.7687902";

  const tokenVotes = await prisma.tokenVote.findMany({
    where: { walletAddress },
    select: { createdAt: true, updatedAt: true, voteWeight: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date (createdAt)
  const byDate: Record<string, { count: number; upCount: number; downCount: number; first: string; last: string }> = {};

  for (const v of tokenVotes) {
    const date = v.createdAt.toISOString().split("T")[0];
    if (!byDate[date]) {
      byDate[date] = { count: 0, upCount: 0, downCount: 0, first: v.createdAt.toISOString(), last: v.createdAt.toISOString() };
    }
    byDate[date].count++;
    if (v.voteWeight > 0) byDate[date].upCount++;
    else byDate[date].downCount++;
    byDate[date].last = v.createdAt.toISOString();
  }

  console.log("Token votes by date (createdAt):");
  for (const [date, info] of Object.entries(byDate)) {
    const duration = (new Date(info.last).getTime() - new Date(info.first).getTime()) / 1000;
    console.log(`  ${date}: ${info.count} votes (${info.upCount} UP, ${info.downCount} DOWN) | ${duration.toFixed(0)}s session`);
  }

  // Check DailyVoteLimit for those dates
  const limits = await prisma.dailyVoteLimit.findMany({
    where: { walletAddress },
    orderBy: { date: "asc" },
  });

  console.log("\nDailyVoteLimit records:");
  for (const l of limits) {
    console.log(`  ${l.date}: ${l.voteCount}`);
  }

  // Check if Feb 9 has a limit record
  const feb9Limit = limits.find(l => l.date === "2026-02-09");
  console.log(`\nFeb 9 DailyVoteLimit: ${feb9Limit ? feb9Limit.voteCount : "❌ NO RECORD"}`);
  console.log(`Feb 9 actual token votes: ${byDate["2026-02-09"]?.count || 0}`);
}

main().then(() => prisma.$disconnect());
