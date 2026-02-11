import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculateVotes() {
  console.log("Starting vote recalculation...");

  const events = await prisma.event.findMany({
    select: { id: true, title: true, votesUp: true, votesDown: true, isForeverMint: true },
  });

  let updated = 0;
  const changes: { title: string; isForeverMint: boolean; old: { up: number; down: number; score: number }; fixed: { up: number; down: number; score: number } }[] = [];

  for (const event of events) {
    // Count regular votes
    const regularVotes = await prisma.vote.groupBy({
      by: ["voteType"],
      where: { eventId: event.id },
      _count: true,
    });

    // Count NFT votes
    const nftVotes = await prisma.nftVote.groupBy({
      by: ["voteType"],
      where: { eventId: event.id },
      _sum: { voteWeight: true },
    });

    let votesUp = 0;
    let votesDown = 0;

    for (const v of regularVotes) {
      if (v.voteType === "UP") votesUp += v._count;
      else if (v.voteType === "DOWN") votesDown += v._count;
    }

    for (const v of nftVotes) {
      const weight = v._sum.voteWeight || 0;
      if (v.voteType === "UP") votesUp += weight;
      else if (v.voteType === "DOWN") votesDown += weight;
    }

    if (event.votesUp !== votesUp || event.votesDown !== votesDown) {
      await prisma.event.update({
        where: { id: event.id },
        data: { votesUp, votesDown },
      });

      changes.push({
        title: event.title.substring(0, 50),
        isForeverMint: event.isForeverMint,
        old: { up: event.votesUp, down: event.votesDown, score: event.votesUp - event.votesDown },
        fixed: { up: votesUp, down: votesDown, score: votesUp - votesDown },
      });
      updated++;
    }
  }

  console.log("\n=== RESULTS ===");
  console.log("Total events checked:", events.length);
  console.log("Events updated:", updated);

  if (changes.length > 0) {
    console.log("\nChanges made:");
    for (const c of changes) {
      console.log(`\n  "${c.title}"${c.isForeverMint ? " (Forever Mint)" : ""}`);
      console.log(`    Before: ${c.old.up} up, ${c.old.down} down = score ${c.old.score}`);
      console.log(`    After:  ${c.fixed.up} up, ${c.fixed.down} down = score ${c.fixed.score}`);
    }
  }

  await prisma.$disconnect();
}

recalculateVotes().catch(console.error);
