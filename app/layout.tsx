import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
});
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ClientProviders } from "@/components/wallet/ClientProviders";
import { VoteLimitProvider } from "@/contexts/VoteLimitContext";

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

const ParticleBackground = dynamic(
  () => import("@/components/effects/ParticleBackground").then((mod) => mod.ParticleBackground),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Hashly - Discover Hedera",
  description: "Discover NFT mints, meetups, hackathons, and everything happening on Hedera. Vote, explore, and never miss an event.",
  keywords: ["hedera", "nft", "mint", "calendar", "crypto", "hashgraph", "hashly", "meetups", "hackathons", "events"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} dark`}>
      <body className="font-sans bg-background text-text-primary antialiased">
        <ClientProviders>
          <VoteLimitProvider>
            <ParticleBackground />
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
