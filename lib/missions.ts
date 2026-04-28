export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT" | "SEASON";
  requirement: number;
  icon: string;
  /** If true, can only be claimed once ever (not reset per season). */
  permanent?: boolean;
}

export const MISSION_DEFINITIONS: MissionDefinition[] = [
  // ── Daily ──────────────────────────────────────────────
  {
    id: "daily_login",
    name: "Daily Check-in",
    description: "Log in to the platform",
    pointsReward: 5,
    type: "DAILY",
    requirement: 1,
    icon: "calendar",
  },
  {
    id: "daily_vote",
    name: "Cast a Vote",
    description: "Vote on at least 1 event today (events only)",
    pointsReward: 10,
    type: "DAILY",
    requirement: 1,
    icon: "vote",
  },
  {
    id: "vote_5_events",
    name: "Active Voter",
    description: "Vote on 3 different events today (events only)",
    pointsReward: 50,
    type: "DAILY",
    requirement: 3,
    icon: "vote",
  },
  // ── Weekly ─────────────────────────────────────────────
  {
    id: "weekly_streak",
    name: "Dedicated User",
    description: "Log in 7 days in a row",
    pointsReward: 50,
    type: "WEEKLY",
    requirement: 7,
    icon: "flame",
  },
  // ── Season (Achievements) ─────────────────────────────
  {
    id: "first_vote",
    name: "First Vote",
    description: "Cast your first vote (any type)",
    pointsReward: 10,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "target",
  },
  {
    id: "first_event",
    name: "Event Creator",
    description: "Get an event approved this season",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "gift",
  },
  {
    id: "event_creator_5",
    name: "Prolific Creator",
    description: "Get 5 events approved this season",
    pointsReward: 500,
    type: "ACHIEVEMENT",
    requirement: 5,
    icon: "gift",
  },
  {
    id: "ecosystem_project_approved",
    name: "Ecosystem Builder",
    description: "Get an Ecosystem project approved this season",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "buildings",
  },
  {
    id: "vote_5_collections",
    name: "NFT Explorer",
    description: "Vote on 5 different NFT collections this season",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 5,
    icon: "vote",
  },
  {
    id: "vote_5_tokens",
    name: "Token Explorer",
    description: "Vote on 5 different tokens this season",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 5,
    icon: "vote",
  },
  {
    id: "vote_5_ecosystem",
    name: "Ecosystem Explorer",
    description: "Vote on 5 different ecosystem projects this season",
    pointsReward: 100,
    type: "ACHIEVEMENT",
    requirement: 5,
    icon: "vote",
  },
  {
    id: "season_streak_25",
    name: "Unstoppable",
    description: "Log in 25 days in a row during the season",
    pointsReward: 500,
    type: "ACHIEVEMENT",
    requirement: 25,
    icon: "flame",
  },
  {
    id: "referral_1",
    name: "Recruiter",
    description: "Have 1 activated referral",
    pointsReward: 100,
    type: "SEASON",
    requirement: 1,
    icon: "users",
  },
  {
    id: "referral_3",
    name: "Ambassador",
    description: "Have 3 activated referrals",
    pointsReward: 500,
    type: "SEASON",
    requirement: 3,
    icon: "users",
  },
  {
    id: "badge_1",
    name: "Badge Holder",
    description: "Own 1 attendance badge",
    pointsReward: 300,
    type: "ACHIEVEMENT",
    requirement: 1,
    icon: "badge",
  },
  {
    id: "badge_3",
    name: "Badge Collector",
    description: "Own 3 attendance badges",
    pointsReward: 1000,
    type: "ACHIEVEMENT",
    requirement: 3,
    icon: "badge",
  },
  {
    id: "hashworld_profile",
    name: "HashWorld Citizen",
    description: "Have your HashWorld profile created",
    pointsReward: 1500,
    type: "SEASON",
    requirement: 1,
    icon: "globe",
  },
];
