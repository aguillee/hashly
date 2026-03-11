import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const S1 = new Date("2026-03-01T00:00:00Z");

async function main() {
  // Get ALL mission claims in S1
  const allMissions = await prisma.pointHistory.findMany({
    where: {
      createdAt: { gte: S1 },
      actionType: "MISSION_CLAIM",
    },
    include: { user: { select: { alias: true, walletAddress: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total mission claim entries in S1: ${allMissions.length}\n`);

  // Group by user + day + mission description to find duplicates
  const grouped: Record<string, typeof allMissions> = {};
  for (const c of allMissions) {
    const day = c.createdAt.toISOString().slice(0, 10);
    const user = c.user.alias || c.user.walletAddress;
    const key = `${user}|${day}|${c.description}`;
    if (grouped[key] === undefined) grouped[key] = [];
    grouped[key].push(c);
  }

  console.log("=== CHECKING FOR DUPLICATE CLAIMS (same user + same day + same mission) ===\n");

  let dupeCount = 0;
  for (const [key, claims] of Object.entries(grouped)) {
    if (claims.length > 1) {
      dupeCount++;
      console.log(`DUPLICATE: ${key} (${claims.length} claims)`);
      for (const c of claims) {
        console.log(`  +${c.points} | ${c.createdAt.toISOString()}`);
      }
    }
  }

  if (dupeCount === 0) {
    console.log("No duplicate mission claims found ✅");
  } else {
    console.log(`\nFound ${dupeCount} duplicate claim groups`);
  }

  // Also check: same mission claimed multiple times (across all days) for ACHIEVEMENT type
  // Achievement missions should only be claimed once per season
  console.log("\n=== CHECKING ACHIEVEMENT MISSIONS FOR MULTI-CLAIMS IN S1 ===\n");

  const achievementMissions = [
    "Mission: First Vote",
    "Mission: Active Voter",
    "Mission: Event Creator",
    "Mission: Recruiter",
    "Mission: HashWorld Citizen",
  ];

  const achievementGrouped: Record<string, typeof allMissions> = {};
  for (const c of allMissions) {
    if (achievementMissions.includes(c.description || "")) {
      const user = c.user.alias || c.user.walletAddress;
      const key = `${user}|${c.description}`;
      if (achievementGrouped[key] === undefined) achievementGrouped[key] = [];
      achievementGrouped[key].push(c);
    }
  }

  let achDupes = 0;
  for (const [key, claims] of Object.entries(achievementGrouped)) {
    if (claims.length > 1) {
      achDupes++;
      console.log(`DUPLICATE ACHIEVEMENT: ${key} (${claims.length} claims)`);
      for (const c of claims) {
        console.log(`  +${c.points} | ${c.createdAt.toISOString()}`);
      }
    }
  }

  if (achDupes === 0) {
    console.log("No duplicate achievement claims found ✅");
  }

  // Check daily_vote and daily_login UserMission for suspicious claims
  console.log("\n=== DAILY MISSION UserMission RECORDS ===\n");
  const dailyRecords = await prisma.userMission.findMany({
    where: {
      missionId: { in: ["daily_vote", "daily_login"] },
      claimedAt: { gte: S1 },
    },
    include: { user: { select: { alias: true, walletAddress: true } } },
    orderBy: { claimedAt: "asc" },
  });

  for (const r of dailyRecords) {
    const label = r.user.alias || r.user.walletAddress;
    // Count how many point history entries for this mission per user
    const phCount = await prisma.pointHistory.count({
      where: {
        userId: r.userId,
        createdAt: { gte: S1 },
        actionType: "MISSION_CLAIM",
        description: r.missionId === "daily_vote" ? "Mission: Cast a Vote" : "Mission: Daily Check-in",
      },
    });
    const missionLabel = r.missionId === "daily_vote" ? "Cast a Vote" : "Daily Check-in";
    console.log(`${label} | ${missionLabel} | claims in S1: ${phCount} | lastClaim: ${r.claimedAt?.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
