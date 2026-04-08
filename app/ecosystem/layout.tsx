import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hedera Ecosystem — Projects Building on Hedera Hashgraph",
  description:
    "Explore the Hedera ecosystem: DeFi protocols, NFT marketplaces, wallets, tools, bridges, gaming, and community projects. Apply to list your project on Hashly.",
  alternates: { canonical: "/ecosystem" },
  openGraph: {
    title: "Hedera Ecosystem Directory | Hashly",
    description:
      "DeFi, NFT, wallets, tools & community projects building on Hedera Hashgraph — discover and list your project.",
    url: "/ecosystem",
  },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
