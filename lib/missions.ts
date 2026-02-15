export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT";
  requirement: number;
  icon: string;
}

export const MISSION_DEFINITIONS: MissionDefinition[] = [
  // Daily
  {
    id: "daily_login",
    name: "Daily Check-in",
    description: "Log in to the platform (+5 pts automatic)",
    pointsReward: 5,
    type: "DAILY",
    requirement: 1,
    icon: "calendar",
  },
  {
    id: "daily_vote",
    name: "Cast a Vote",
    description: "Vote on at least 1 event (+10 pts per vote)",
    pointsReward: 10,
    type: "DAILY",
    requirement: 1,
    icon: "vote",
  },
  {
    id: "vote_5_events",
    name: "Active Voter",
    description: "Vote on 5 different events today",
    pointsReward: 50,
    type: "DAILY",
    requirement: 5,
    icon: "vote",
  },
  // Weekly
  {
    id: "weekly_streak",
    name: "Dedicated User",
    description: "Log in 7 days in a row (+50 pts bonus)",
    pointsReward: 50,
    type: "WEEKLY",
    requirement: 7,
    icon: "flame",
  },
  {
    id: "weekly_votes",
    name: "Super Voter",
    description: "Vote on 20 events this week",
    pointsReward: 200,
    type: "WEEKLY",
    requirement: 20,
    icon: "trophy",
  },
  // Achievements
  {
    id: "first_vote",
    name: "First Vote",
    description: "Cast your first vote",
    pointsReward: 10,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "target",
  },
  {
    id: "first_event",
    name: "Event Creator",
    description: "Submit your first approved event",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "gift",
  },
  {
    id: "votes_100",
    name: "Voting Enthusiast",
    description: "Cast 100 votes total",
    pointsReward: 1000,
    type: "ACHIEVEMENT",
    requirement: 100,
    icon: "trophy",
  },
  {
    id: "votes_500",
    name: "Voting Legend",
    description: "Cast 500 votes total",
    pointsReward: 5000,
    type: "ACHIEVEMENT",
    requirement: 500,
    icon: "trophy",
  },
  {
    id: "collection_votes_50",
    name: "Collection Explorer",
    description: "Vote on 50 different collections (+1 pt per vote)",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 50,
    icon: "vote",
  },
  {
    id: "collection_votes_100",
    name: "Collection Master",
    description: "Vote on 100 different collections (+1 pt per vote)",
    pointsReward: 500,
    type: "ACHIEVEMENT",
    requirement: 100,
    icon: "trophy",
  },
];
