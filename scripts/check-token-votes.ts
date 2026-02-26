import { prisma } from "../lib/db";

async function main() {
  const walletAddress = "0.0.7687902";

  const tokenVotes = await prisma.tokenVote.findMany({
    where: { walletAddress },
    include: { token: { select: { name: true, symbol: true, tokenAddress: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Token votes for ${walletAddress}: ${tokenVotes.length}\n`);

  for (const [i, v] of tokenVotes.entries()) {
    console.log(`${String(i + 1).padStart(3)}. ${v.token.symbol.padEnd(12)} | ${v.token.name.substring(0, 35).padEnd(35)} | ${v.token.tokenAddress} | weight=${v.voteWeight} | created=${v.createdAt.toISOString()} | updated=${v.updatedAt.toISOString()}`);
  }
}

main().then(() => prisma.$disconnect());
