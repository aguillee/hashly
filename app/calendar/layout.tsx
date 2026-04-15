import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events Calendar — NFT Mints, Meetups & Hackathons on Hedera",
  description:
    "Browse all upcoming Hedera events: NFT mints, meetups, hackathons, and forever mints. Filter by date, type, and vote for your favorites with on-chain HCS voting.",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "Hedera Events Calendar | Hashly",
    description:
      "Upcoming NFT mints, meetups & hackathons on Hedera — filter, search, and vote on-chain.",
    url: "/calendar",
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
