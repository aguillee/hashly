import { prisma } from "../lib/db";

async function main() {
  const userId = process.argv[2] || "cml00jdo10000s0l22yjwvw6g";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  console.log(`=== ALL VOTES FOR ${user.alias} (${user.walletAddress}) ===\n`);

  // 1. Event votes
  const eventVotes = await prisma.vote.findMany({
    where: { userId },
    include: { event: { select: { title: true, isForeverMint: true, event_type: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`--- EVENT VOTES (${eventVotes.length}) ---`);
  for (const [i, v] of eventVotes.entries()) {
    const dir = v.voteType === "UP" ? "👍" : "👎";
    console.log(`${String(i + 1).padStart(3)}. ${dir} ${v.event.title.substring(0, 45).padEnd(45)} | ${v.event.event_type.padEnd(16)} | forever=${v.event.isForeverMint} | ${v.createdAt.toISOString()}`);
  }

  // 2. Collection votes
  const collectionVotes = await prisma.collectionVote.findMany({
    where: { walletAddress: user.walletAddress },
    include: { collection: { select: { name: true, tokenAddress: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n--- COLLECTION VOTES (${collectionVotes.length}) ---`);
  for (const [i, v] of collectionVotes.entries()) {
    const dir = v.voteWeight > 0 ? "👍" : "👎";
    console.log(`${String(i + 1).padStart(3)}. ${dir} ${v.collection.name.substring(0, 45).padEnd(45)} | ${v.collection.tokenAddress} | w=${String(v.voteWeight).padStart(3)} | created=${v.createdAt.toISOString()} | updated=${v.updatedAt.toISOString()}`);
  }

  // 3. Token votes
  const tokenVotes = await prisma.tokenVote.findMany({
    where: { walletAddress: user.walletAddress },
    include: { token: { select: { name: true, symbol: true, tokenAddress: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n--- TOKEN VOTES (${tokenVotes.length}) ---`);
  for (const [i, v] of tokenVotes.entries()) {
    const dir = v.voteWeight > 0 ? "👍" : "👎";
    console.log(`${String(i + 1).padStart(3)}. ${dir} ${v.token.symbol.padEnd(12)} ${v.token.name.substring(0, 35).padEnd(35)} | ${v.token.tokenAddress} | w=${String(v.voteWeight).padStart(3)} | created=${v.createdAt.toISOString()} | updated=${v.updatedAt.toISOString()}`);
  }

  // Summary
  const upEvents = eventVotes.filter(v => v.voteType === "UP").length;
  const downEvents = eventVotes.filter(v => v.voteType === "DOWN").length;
  const upCollections = collectionVotes.filter(v => v.voteWeight > 0).length;
  const downCollections = collectionVotes.filter(v => v.voteWeight < 0).length;
  const upTokens = tokenVotes.filter(v => v.voteWeight > 0).length;
  const downTokens = tokenVotes.filter(v => v.voteWeight < 0).length;

  console.log(`\n=== SUMMARY ===`);
  console.log(`Events:      ${eventVotes.length} (${upEvents} UP, ${downEvents} DOWN)`);
  console.log(`Collections: ${collectionVotes.length} (${upCollections} UP, ${downCollections} DOWN)`);
  console.log(`Tokens:      ${tokenVotes.length} (${upTokens} UP, ${downTokens} DOWN)`);
  console.log(`TOTAL:       ${eventVotes.length + collectionVotes.length + tokenVotes.length} (${upEvents + upCollections + upTokens} UP, ${downEvents + downCollections + downTokens} DOWN)`);
}

main().then(() => prisma.$disconnect());
