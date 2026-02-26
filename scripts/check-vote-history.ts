import { prisma } from "../lib/db";

async function main() {
  const userId = "cml00jdo10000s0l22yjwvw6g";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  console.log("User:", user.walletAddress, "| Alias:", user.alias);
  console.log("Created:", user.createdAt);
  console.log("");

  // DailyVoteLimit - all records
  const allLimits = await prisma.dailyVoteLimit.findMany({
    where: { walletAddress: user.walletAddress },
    orderBy: { date: "desc" },
  });

  let totalFromLimits = 0;
  let daysOverLimit = 0;
  console.log("DailyVoteLimit history (all days):");
  for (const l of allLimits) {
    const over = l.voteCount > 5 ? ` ⚠️ OVER LIMIT (+${l.voteCount - 5})` : "";
    if (l.voteCount > 5) daysOverLimit++;
    totalFromLimits += l.voteCount;
    console.log(`  ${l.date}: ${l.voteCount}${over}`);
  }
  console.log(`\nTotal days voted: ${allLimits.length}`);
  console.log(`Days over limit: ${daysOverLimit}`);
  console.log(`Total from DailyVoteLimit: ${totalFromLimits}`);
  console.log(`Extra votes from race condition: ${totalFromLimits - allLimits.length * 5}`);

  // Votes per day from actual vote records
  const eventVotes = await prisma.vote.findMany({
    where: { userId },
    select: { createdAt: true },
  });
  const collectionVotes = await prisma.collectionVote.findMany({
    where: { walletAddress: user.walletAddress },
    select: { createdAt: true },
  });
  const tokenVotes = await prisma.tokenVote.findMany({
    where: { walletAddress: user.walletAddress },
    select: { createdAt: true },
  });

  console.log("\n--- Actual vote records ---");
  console.log("Event vote records:", eventVotes.length);
  console.log("Collection vote records:", collectionVotes.length);
  console.log("Token vote records:", tokenVotes.length);
  console.log("Total records:", eventVotes.length + collectionVotes.length + tokenVotes.length);

  // Note: some votes may have been updated (re-votes),
  // so count != actual number of voting actions
}

main().then(() => prisma.$disconnect());
