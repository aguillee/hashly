"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  ArrowRight,
  Vote,
  Shield,
  ExternalLink,
  Gift,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { ForeverMintsSection } from "@/components/events/ForeverMintsSection";
import { useWalletStore } from "@/store";

interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  status: "UPCOMING" | "LIVE" | "ENDED";
  votesUp: number;
  votesDown: number;
  score?: number;
}

interface FeaturedData {
  mostVoted: FeaturedEvent | null;
  nextUp: FeaturedEvent | null;
}

export default function HomePage() {
  const { isConnected } = useWalletStore();
  const [featured, setFeatured] = React.useState<FeaturedData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/events/featured");
        if (response.ok) {
          const data = await response.json();
          setFeatured(data);
        }
      } catch (error) {
        console.error("Failed to fetch featured events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="gradient-text">Discover NFTs on Hedera</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Explore new and existing collections, vote on your favorites, and see what the community ranks at the top.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <Link href="/events/new">
                  <Button size="xl" className="gap-2 group">
                    <Plus className="h-5 w-5" />
                    Submit a Mint Event
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <Button size="xl" className="gap-2" disabled>
                  <Plus className="h-5 w-5" />
                  Connect Wallet to Submit
                </Button>
              )}

              <Link href="/calendar">
                <Button variant="secondary" size="xl" className="gap-2">
                  <Calendar className="h-5 w-5" />
                  Browse Calendar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
          ) : featured?.mostVoted || featured?.nextUp ? (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Most Voted - Takes 2 columns */}
              {featured.mostVoted && (
                <div className="lg:col-span-2">
                  <FeaturedEventCard event={featured.mostVoted} variant="mostVoted" />
                </div>
              )}

              {/* Next Up - Takes 1 column */}
              {featured.nextUp && (
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-400" />
                    Minting Soon
                  </h3>
                  <FeaturedEventCard event={featured.nextUp} variant="nextUp" />

                  {/* View All Link */}
                  <Link
                    href="/calendar"
                    className="mt-4 text-center text-sm text-accent-primary hover:underline"
                  >
                    View all events →
                  </Link>
                </div>
              )}

              {/* If only mostVoted exists */}
              {featured.mostVoted && !featured.nextUp && (
                <div className="flex items-center justify-center">
                  <Link
                    href="/calendar"
                    className="text-center text-sm text-accent-primary hover:underline"
                  >
                    View all events →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No events yet
              </h3>
              <p className="text-text-secondary mb-6">
                Be the first to submit an event!
              </p>
              {isConnected && (
                <Link href="/events/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Submit Event
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Forever Mints Section */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ForeverMintsSection />
        </div>
      </section>

      {/* Info Section - NFT Benefits */}
      <section className="py-12 bg-bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Community members vote on events to help surface the best projects.
              Hold special NFTs to unlock bonus voting power.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Base Voting */}
            <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-4">
                <Vote className="h-6 w-6 text-accent-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Community Voting
              </h3>
              <p className="text-text-secondary text-sm">
                Connect your wallet to vote on upcoming mints. Your votes help the
                community discover quality projects.
              </p>
            </div>

            {/* Santuario Hedera */}
            <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Gift className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Santuario Hedera
              </h3>
              <p className="text-text-secondary text-sm mb-3">
                Hold dragons from this collection to get{" "}
                <span className="text-accent-primary font-semibold">+1 vote per dragon</span>{" "}
                per project you vote on.
              </p>
              <a
                href="https://sentx.io/nft-marketplace/0.0.7235629"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline"
              >
                View on SentX
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* El Santuario */}
            <div className="p-6 rounded-2xl bg-bg-card border border-border hover:border-accent-secondary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                El Santuario
              </h3>
              <p className="text-text-secondary text-sm mb-3">
                Premium membership with{" "}
                <span className="text-accent-secondary font-semibold">+20 votes per project</span>{" "}
                plus auto-approval for your submitted events.
              </p>
              <a
                href="https://sentx.io/nft-marketplace/0.0.9954622"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent-secondary hover:underline"
              >
                View on SentX
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
