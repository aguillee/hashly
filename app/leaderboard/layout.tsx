import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard — Top Voters & Contributors on Hedera",
  description:
    "See the top Hedera community members ranked by voting power, XP, missions completed, and seasonal rewards. Compete for prizes every season.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Community Leaderboard | Hashly",
    description:
      "Top Hedera community members ranked by XP, voting power & seasonal rewards.",
    url: "/leaderboard",
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
