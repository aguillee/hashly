import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missions — Earn XP & Rewards on Hedera",
  description:
    "Complete daily and weekly missions to earn XP, climb the leaderboard, and unlock rewards. Vote on events, attend meetups, and explore the Hedera ecosystem.",
  alternates: { canonical: "/missions" },
  openGraph: {
    title: "Missions & Rewards | Hashly",
    description:
      "Earn XP by voting, attending events & exploring Hedera. Complete missions, climb the leaderboard & win prizes.",
    url: "/missions",
  },
};

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
