import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ClientProviders } from "@/components/wallet/ClientProviders";
import { VoteLimitProvider } from "@/contexts/VoteLimitContext";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
});

// Dynamic imports for client components that use browser APIs
const Navbar = dynamic(
  () => import("@/components/layout/Navbar").then((mod) => mod.Navbar),
  { ssr: false }
);

const Footer = dynamic(
  () => import("@/components/layout/Footer").then((mod) => mod.Footer),
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

const GlowOrbs = dynamic(
  () => import("@/components/effects/GlowOrbs").then((mod) => mod.GlowOrbs),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Hashly - Discover Hedera",
  description:
    "Discover NFT mints, meetups, hackathons, and everything happening on Hedera. Vote, explore, and never miss an event.",
  keywords: ["hedera", "nft", "mint", "calendar", "crypto", "hashgraph", "hashly", "meetups", "hackathons", "events"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} dark`}>
      <body className={`${sora.className} min-h-screen bg-background antialiased flex flex-col relative`}>
        {/* Animated background effects */}
        <GlowOrbs />
        <ParticleBackground />

        <ClientProviders>
          <VoteLimitProvider>
            <Navbar />
            <main className="pt-16 flex-1 relative z-10">{children}</main>
            <Footer />
            <Toaster />
          </VoteLimitProvider>
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
