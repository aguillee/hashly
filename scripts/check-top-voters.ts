import { prisma } from "../lib/db";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 30,
    select: { id: true, walletAddress: true, alias: true, points: true },
  });

  console.log("=== TOP 30 USERS BY POINTS ===\n");
  console.log("Rank | Alias                | Wallet        | Points  | Events | Collections | Tokens  | TOTAL   | 👍 UP  | 👎 DOWN | %DOWN");
  console.log("-----|----------------------|---------------|---------|--------|-------------|---------|---------|--------|---------|------");

  for (const [i, user] of users.entries()) {
    const [eventVotes, collectionVotes, tokenVotes] = await Promise.all([
      prisma.vote.findMany({ where: { userId: user.id }, select: { voteType: true } }),
      prisma.collectionVote.findMany({ where: { walletAddress: user.walletAddress }, select: { voteWeight: true } }),
      prisma.tokenVote.findMany({ where: { walletAddress: user.walletAddress }, select: { voteWeight: true } }),
    ]);

    const evUp = eventVotes.filter(v => v.voteType === "UP").length;
    const evDown = eventVotes.filter(v => v.voteType === "DOWN").length;
    const colUp = collectionVotes.filter(v => v.voteWeight > 0).length;
    const colDown = collectionVotes.filter(v => v.voteWeight < 0).length;
    const tokUp = tokenVotes.filter(v => v.voteWeight > 0).length;
    const tokDown = tokenVotes.filter(v => v.voteWeight < 0).length;

    const totalUp = evUp + colUp + tokUp;
    const totalDown = evDown + colDown + tokDown;
    const total = totalUp + totalDown;
    const pctDown = total > 0 ? ((totalDown / total) * 100).toFixed(1) : "0.0";

    const rank = String(i + 1).padStart(2);
    const alias = (user.alias || "-").substring(0, 20).padEnd(20);
    const wallet = user.walletAddress.padEnd(13);
    const pts = String(user.points).padStart(7);
    const ev = String(eventVotes.length).padStart(6);
    const col = String(collectionVotes.length).padStart(11);
    const tok = String(tokenVotes.length).padStart(7);
    const tot = String(total).padStart(7);
    const up = String(totalUp).padStart(6);
    const down = String(totalDown).padStart(7);

    console.log(`  ${rank} | ${alias} | ${wallet} | ${pts} | ${ev} | ${col} | ${tok} | ${tot} | ${up} | ${down} | ${pctDown}%`);
  }
}

main().then(() => prisma.$disconnect());
