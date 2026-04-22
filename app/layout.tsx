import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ClientProviders } from "@/components/wallet/ClientProviders";
import { VoteLimitProvider } from "@/contexts/VoteLimitContext";
import { JsonLd } from "@/components/seo/JsonLd";
import { AmbientBackground } from "@/components/effects/AmbientBackground";

const Sidebar = dynamic(
  () => import("@/components/layout/Sidebar").then((mod) => mod.Sidebar),
  { ssr: false }
);

const MobileHeader = dynamic(
  () => import("@/components/layout/MobileHeader").then((mod) => mod.MobileHeader),
  { ssr: false }
);

const Toaster = dynamic(
  () => import("@/components/ui/Toaster").then((mod) => mod.Toaster),
  { ssr: false }
);

const SITE_URL = "https://hash-ly.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hashly — Discover NFT Mints, Events & Projects on Hedera",
    template: "%s | Hashly",
  },
  description:
    "The Hedera ecosystem hub. Discover upcoming NFT mints, meetups, hackathons, token rankings, and community projects — all powered by on-chain voting via HCS.",
  keywords: [
    "hedera", "hedera hashgraph", "hbar", "nft mint", "nft calendar",
    "hedera nft", "hedera events", "hedera meetups", "hedera hackathons",
    "hedera ecosystem", "hedera projects", "hedera tokens",
    "hashly", "crypto events", "web3 calendar", "nft rarity",
    "hedera community", "on-chain voting", "hcs voting",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Hashly",
    title: "Hashly — Discover NFT Mints, Events & Projects on Hedera",
    description:
      "The Hedera ecosystem hub. Discover upcoming NFT mints, meetups, hackathons, token rankings, and community projects — all powered by on-chain voting.",
    images: [
      {
        url: "/logohashly.png",
        width: 1920,
        height: 1080,
        alt: "Hashly — Hedera Ecosystem Hub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@hashly_h",
    creator: "@hashly_h",
    title: "Hashly — Discover NFT Mints, Events & Projects on Hedera",
    description:
      "The Hedera ecosystem hub. NFT mints, meetups, hackathons, token rankings & community projects — powered by on-chain voting.",
    images: ["/logohashly.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} dark`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans bg-background text-text-primary antialiased">
        <JsonLd />
        <AmbientBackground />
        <ClientProviders>
          <VoteLimitProvider>
            <div className="flex h-screen relative z-[1]">
              <Sidebar />
              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <MobileHeader />
                {children}
              </main>
            </div>
            <Toaster />
          </VoteLimitProvider>
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
