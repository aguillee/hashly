import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — Connect Your Wallet to Hedera",
  description:
    "Set up your Hedera wallet, connect to Hashly, and start voting on NFT mints, meetups, and hackathons. Step-by-step guide for new users.",
  alternates: { canonical: "/onboarding" },
  openGraph: {
    title: "Get Started with Hashly | Hedera",
    description:
      "Connect your wallet & start exploring the Hedera ecosystem. Step-by-step onboarding guide.",
    url: "/onboarding",
  },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
