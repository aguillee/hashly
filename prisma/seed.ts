import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const missions = [
  // Daily
  {
    id: "daily_login",
    name: "Daily Check-in",
    description: "Log in to the platform",
    pointsReward: 5,
    type: "DAILY" as const,
    requirement: 1,
    icon: "calendar",
  },
  {
    id: "daily_vote",
    name: "Cast a Vote",
    description: "Vote on at least 1 event",
    pointsReward: 10,
    type: "DAILY" as const,
    requirement: 1,
    icon: "vote",
  },
  {
    id: "vote_5_events",
    name: "Active Voter",
    description: "Vote on 5 different events today",
    pointsReward: 25,
    type: "DAILY" as const,
    requirement: 5,
    icon: "vote",
  },
  // Weekly
  {
    id: "weekly_streak",
    name: "Dedicated User",
    description: "Log in 7 days in a row",
    pointsReward: 50,
    type: "WEEKLY" as const,
    requirement: 7,
    icon: "flame",
  },
  {
    id: "weekly_votes",
    name: "Super Voter",
    description: "Vote on 20 events this week",
    pointsReward: 100,
    type: "WEEKLY" as const,
    requirement: 20,
    icon: "trophy",
  },
  // Achievements
  {
    id: "first_vote",
    name: "First Vote",
    description: "Cast your first vote",
    pointsReward: 20,
    type: "ACHIEVEMENT" as const,
    requirement: 1,
    icon: "target",
  },
  {
    id: "first_event",
    name: "Event Creator",
    description: "Submit your first event",
    pointsReward: 30,
    type: "ACHIEVEMENT" as const,
    requirement: 1,
    icon: "gift",
  },
  {
    id: "votes_100",
    name: "Voting Enthusiast",
    description: "Cast 100 votes total",
    pointsReward: 100,
    type: "ACHIEVEMENT" as const,
    requirement: 100,
    icon: "trophy",
  },
  {
    id: "votes_500",
    name: "Voting Legend",
    description: "Cast 500 votes total",
    pointsReward: 300,
    type: "ACHIEVEMENT" as const,
    requirement: 500,
    icon: "trophy",
  },
];

async function main() {
  console.log("Seeding...");

  // Note: Missions are defined statically in the code and don't need database seeding
  // The UserMission table tracks user progress against mission IDs

  console.log("  Missions are handled via static definitions in the missions API");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
