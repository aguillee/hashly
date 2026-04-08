import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFT Rarity Checker — Santuario Hedera Dragon Rankings",
  description:
    "Check rarity rankings for Santuario Hedera Dragon NFTs. View trait breakdowns, rarity scores, and circulating supply. 534 unique dragons ranked by 9 trait types.",
  alternates: { canonical: "/rarity" },
  openGraph: {
    title: "Dragon NFT Rarity Rankings | Hashly",
    description:
      "Santuario Hedera Dragon NFT rarity checker — trait breakdowns, scores & rankings for 534 dragons.",
    url: "/rarity",
  },
};

export default function RarityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
