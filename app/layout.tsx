import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { ClientProviders } from "@/components/wallet/ClientProviders";

// Dynamic imports for client components that use browser APIs
const Navbar = dynamic(
  () => import("@/components/layout/Navbar").then((mod) => mod.Navbar),
  { ssr: false }
);

const Toaster = dynamic(
  () => import("@/components/ui/Toaster").then((mod) => mod.Toaster),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Hashly - Discover NFT Mints on Hedera",
  description:
    "The ultimate calendar for upcoming NFT mints on Hedera. Vote, discover, and never miss a mint.",
  keywords: ["hedera", "nft", "mint", "calendar", "crypto", "hashgraph", "hashly"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <ClientProviders>
          <Navbar />
          <main className="pt-16">{children}</main>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
