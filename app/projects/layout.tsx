import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hedera Projects — Vote & Rank Tokens and NFT Collections",
  description:
    "Discover and vote on Hedera tokens and NFT collections. Community-driven rankings powered by on-chain HCS voting with NFT-boosted voting power.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Hedera Token & NFT Rankings | Hashly",
    description:
      "Community-ranked Hedera tokens & NFT collections — vote on-chain with HCS voting power.",
    url: "/projects",
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
