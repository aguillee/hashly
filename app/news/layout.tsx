import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hedera News — Latest Updates from the Hedera Ecosystem",
  description:
    "Stay updated with the latest Hedera Hashgraph news: protocol updates, DeFi launches, NFT drops, partnership announcements, and community highlights.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "Hedera Ecosystem News | Hashly",
    description:
      "Latest Hedera news: protocol updates, DeFi launches, NFT drops & community highlights.",
    url: "/news",
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
