import { prisma } from "../lib/db";

async function main() {
  const userId = "cml00jdo10000s0l22yjwvw6g";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { console.log("User not found"); return; }

  console.log("User:", user.walletAddress, "| Alias:", user.alias);

  const [eventVotes, collectionVotes, tokenVotes] = await Promise.all([
    prisma.vote.count({ where: { userId: user.id } }),
    prisma.collectionVote.count({ where: { walletAddress: user.walletAddress } }),
    prisma.tokenVote.count({ where: { walletAddress: user.walletAddress } }),
  ]);

  console.log("Event votes:", eventVotes);
  console.log("Collection votes:", collectionVotes);
  console.log("Token votes:", tokenVotes);
  console.log("TOTAL:", eventVotes + collectionVotes + tokenVotes);

  // Today's votes
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [todayEvents, todayCollections, todayTokens, dailyLimit] = await Promise.all([
    prisma.vote.count({ where: { userId: user.id, createdAt: { gte: startOfDay } } }),
    prisma.collectionVote.count({ where: { walletAddress: user.walletAddress, updatedAt: { gte: startOfDay } } }),
    prisma.tokenVote.count({ where: { walletAddress: user.walletAddress, updatedAt: { gte: startOfDay } } }),
    prisma.dailyVoteLimit.findFirst({ where: { walletAddress: user.walletAddress }, orderBy: { createdAt: "desc" } }),
  ]);

  console.log("\n--- Today ---");
  console.log("Event votes today:", todayEvents);
  console.log("Collection votes today:", todayCollections);
  console.log("Token votes today:", todayTokens);
  console.log("Today total:", todayEvents + todayCollections + todayTokens);
  console.log("DailyVoteLimit record:", dailyLimit?.voteCount, "on date", dailyLimit?.date);
}

main().then(() => prisma.$disconnect());
