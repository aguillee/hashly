import { prisma } from "../lib/db";

async function main() {
  const userId = "cml00jdo10000s0l22yjwvw6g";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { console.log("User not found"); return; }

  console.log("User:", user.walletAddress, "| Alias:", user.alias);
  console.log("Login streak:", user.loginStreak);
  console.log("Last login:", user.lastLogin);
  console.log("");

  // Get user missions
  const userMissions = await prisma.userMission.findMany({
    where: { userId },
    orderBy: { missionId: "asc" },
  });

  console.log("UserMission records:");
  for (const um of userMissions) {
    console.log(`  ${um.missionId}: progress=${um.progress}, claimedAt=${um.claimedAt}, completedAt=${um.completedAt}`);
  }

  // Simulate what GET /api/missions returns
  const walletAddress = user.walletAddress;
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [totalEventVotes, totalCollectionVotes, totalTokenVotes, collectionVotesCount] = await Promise.all([
    prisma.vote.count({ where: { userId: user.id } }),
    prisma.collectionVote.count({ where: { walletAddress } }),
    prisma.tokenVote.count({ where: { walletAddress } }),
    prisma.collectionVote.count({ where: { walletAddress } }),
  ]);

  const totalVotes = totalEventVotes + totalCollectionVotes + totalTokenVotes;

  console.log("\n--- API would calculate ---");
  console.log("totalEventVotes:", totalEventVotes);
  console.log("totalCollectionVotes:", totalCollectionVotes);
  console.log("totalTokenVotes:", totalTokenVotes);
  console.log("totalVotes:", totalVotes);
  console.log("collectionVotesCount:", collectionVotesCount);
  console.log("\nvotes_100 progress:", Math.min(totalVotes, 100), "/ 100 →", totalVotes >= 100 ? "COMPLETED" : "incomplete");
  console.log("votes_500 progress:", Math.min(totalVotes, 500), "/ 500 →", totalVotes >= 500 ? "COMPLETED" : "incomplete");
  console.log("collection_votes_50:", Math.min(collectionVotesCount, 50), "/ 50 →", collectionVotesCount >= 50 ? "COMPLETED" : "incomplete");
  console.log("collection_votes_100:", Math.min(collectionVotesCount, 100), "/ 100 →", collectionVotesCount >= 100 ? "COMPLETED" : "incomplete");
}

main().then(() => prisma.$disconnect());
