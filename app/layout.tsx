import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ClientProviders } from "@/components/wallet/ClientProviders";

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

export const metadata: Metadata = {
  title: "Hashly - Discover Events on Hedera",
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
    <html lang="en">
      <body className="min-h-screen bg-background antialiased flex flex-col">
        <ClientProviders>
          <Navbar />
          <main className="pt-16 flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
