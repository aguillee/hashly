"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  ArrowRight,
  Vote,
  ExternalLink,
  Loader2,
  Sparkles,
  Infinity,
  Trophy,
  Star,
  MapPin,
  Users,
  Clock,
  Code2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { TopCollectionsPodium } from "@/components/collections/TopCollectionsPodium";
import { TopTokensPodium } from "@/components/tokens/TopTokensPodium";
import { useWalletStore } from "@/store";
import { useFeatured, useHomeAds } from "@/lib/swr";
import { formatDate } from "@/lib/utils";
import { HomeAdCarousel } from "@/components/ads/HomeAdCarousel";

// Reusable event card for meetup/hackathon 3-column sections - News style
function EventColumnCard({ event, icon: Icon, accentColor = "accent-primary" }: { event: any; icon: any; accentColor?: string }) {
  const isLive = event.status === "LIVE";
  const borderColor = accentColor === "violet-500"
    ? "border-l-violet-500 hover:border-l-violet-400"
    : isLive
      ? "border-l-green-500 hover:border-l-green-400"
      : "border-l-accent-primary/50 hover:border-l-accent-primary";

  // Calculate time until event
  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "Starting soon";
  };

  const timeUntil = !isLive ? getTimeUntil(event.mintDate) : null;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={`relative h-full bg-bg-card/80 overflow-hidden transition-all duration-200 border-l-4 rounded-r-md ${borderColor}`}>
        {/* Image area */}
        <div className="relative aspect-video bg-bg-secondary overflow-hidden">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
              <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-text-secondary/30" />
            </div>
          )}

          {/* Date badge - same style as countdown */}
          <div className="absolute top-2 left-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
              <Calendar className="h-3 w-3" />
              <span className="font-mono">{formatDate(new Date(event.mintDate).toISOString())}</span>
            </div>
          </div>

          {/* Status Badge - skewed tag style */}
          <div className="absolute top-2 right-2">
            {isLive ? (
              <span className="skew-tag inline-block px-2 py-0.5 bg-green-600 text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
                <span>LIVE NOW</span>
              </span>
            ) : (
              <span className="skew-tag inline-block px-2 py-0.5 bg-accent-primary text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
                <span>UPCOMING</span>
              </span>
            )}
          </div>

          {/* Countdown for upcoming */}
          {timeUntil && (
            <div className="absolute bottom-2 left-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{timeUntil}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col border-t border-border/30">
          {/* Host */}
          {event.host && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary/70 mb-1.5">
              <span className="w-1 h-1 rounded-full bg-accent-primary" />
              <span className="truncate">{event.host}</span>
            </div>
          )}

          {/* Title */}
          <h4 className="font-bold text-text-primary mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-tight">
            {event.title}
          </h4>

          {/* Location info */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {event.location_type === "IN_PERSON" && event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>

          {/* Show prizes if available */}
          {event.prizes && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 bg-amber-500/10 border-l-2 border-amber-500">
              <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-400 line-clamp-1">{event.prizes}</span>
            </div>
          )}

          {/* Footer with stars and details */}
          <div className="mt-3 pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-500 font-mono">{event.votesUp}</span>
            </div>
            <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
              details <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { isConnected } = useWalletStore();
  const { data: featured, isLoading: loading } = useFeatured();
  const { data: homeAdsData } = useHomeAds();
  const homeAds = homeAdsData?.ads || [];
  const hasAds = homeAds.length > 0;

  const hasFeaturedEvents = featured?.mostVoted || featured?.mostVotedLive || featured?.nextUp || featured?.topForeverMint;
  const hasMeetups = featured?.topMeetup || featured?.nextMeetup;
  const hasHackathons = featured?.topHackathon || featured?.nextHackathon || featured?.bigPrizeHackathon;

  return (
    <div className="min-h-screen">
      {/* Hero + How It Works - Combined compact section */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Hero: 2 or 3 columns on desktop */}
          <div className={`grid ${hasAds ? "lg:grid-cols-[4fr_3fr_3fr]" : "lg:grid-cols-2"} gap-6 lg:gap-8 items-center`}>
            {/* Left: Title + CTA */}
            <div className="text-center lg:text-left space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-bg-card dark:bg-[#1a1a2e] border-2 border-accent-primary/50 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-accent-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-sm border-2 border-bg-primary animate-pulse" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
                    Discover Hedera
                  </h1>
                  <p className="text-sm sm:text-base text-text-secondary">
                    Events, NFTs & Community Rankings
                  </p>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
                {isConnected ? (
                  <Link href="/events/new">
                    <Button className="gap-2 group text-sm px-5 py-2.5">
                      <Plus className="h-4 w-4" />
                      Submit Event
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button className="gap-2 text-sm px-5 py-2.5" disabled>
                    <Plus className="h-4 w-4" />
                    Connect to Submit
                  </Button>
                )}

                <a
                  href="https://x.com/hashly_h"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-text-secondary hover:text-accent-primary transition-colors border border-border rounded-lg hover:border-accent-primary/50"
                >
                  Collaborate? <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Right: How It Works - compact cards */}
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-xs sm:text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1 sm:mb-2 flex items-center gap-2">
                <span className="w-6 h-px bg-text-secondary/30 hidden sm:block" />
                how it works
                <span className="w-6 h-px bg-text-secondary/30 hidden sm:block" />
              </h2>

              <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-accent-primary/10 via-accent-primary/5 to-transparent border-l-4 border-l-accent-primary rounded-r-md hover:from-accent-primary/15 hover:via-accent-primary/10 transition-all group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-accent-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-accent-primary/50 group-hover:border-accent-primary transition-all">
                  <Vote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors">Community Voting</h3>
                  <p className="text-text-secondary text-[10px] sm:text-xs leading-relaxed">Connect your wallet to vote and help discover quality projects.</p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent border-l-4 border-l-yellow-500 rounded-r-md hover:from-yellow-500/15 hover:via-yellow-400/10 transition-all group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded overflow-hidden flex-shrink-0 border-2 border-yellow-500/50 group-hover:border-yellow-500 transition-all">
                  <img src="https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8" alt="Santuario Hedera" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-yellow-500 transition-colors">Santuario Hedera</h3>
                    <a href="https://sentx.io/nft-marketplace/0.0.7235629" target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-yellow-500 hover:underline flex-shrink-0">SentX ↗</a>
                  </div>
                  <p className="text-text-secondary text-[10px] sm:text-xs leading-relaxed">
                    <span className="text-yellow-400 font-semibold">+1 vote per dragon</span> per project you vote on.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-purple-500/10 via-purple-400/5 to-transparent border-l-4 border-l-purple-500 rounded-r-md hover:from-purple-500/15 hover:via-purple-400/10 transition-all group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded overflow-hidden flex-shrink-0 border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                  <img src="https://launchpad-assets.kabila.app/logo/0.0.9954622/JPLTxQfsoC/logo.png" alt="El Santuario" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-purple-400 transition-colors">El Santuario</h3>
                    <a href="https://sentx.io/nft-marketplace/0.0.9954622" target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-purple-400 hover:underline flex-shrink-0">SentX ↗</a>
                  </div>
                  <p className="text-text-secondary text-[10px] sm:text-xs leading-relaxed">
                    <span className="text-purple-400 font-semibold">+5 votes per project</span> plus auto-approval.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Ad Carousel - only visible when ads exist */}
            {hasAds && (
              <div className="h-48 sm:h-56 lg:h-full lg:min-h-[280px] order-first lg:order-none">
                <HomeAdCarousel ads={homeAds} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Events: 3 columns - Most Voted | Minting Soon | Top Forever Mint */}
      {loading ? (
        <section className="py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          </div>
        </section>
      ) : hasFeaturedEvents ? (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">
                NFT Events
              </h2>
              <Link href="/calendar" className="text-xs sm:text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${
              [featured?.mostVotedLive, featured?.mostVoted, featured?.nextUp, featured?.topForeverMint].filter(Boolean).length >= 4
                ? "md:grid-cols-2 lg:grid-cols-4"
                : [featured?.mostVotedLive, featured?.mostVoted, featured?.nextUp, featured?.topForeverMint].filter(Boolean).length === 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2"
            }`}>
              {/* Live Now - Most Voted */}
              {featured?.mostVotedLive && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                    Live Now
                  </h3>
                  <FeaturedEventCard event={featured.mostVotedLive} variant="nextUp" />
                </div>
              )}

              {/* Most Voted */}
              {featured?.mostVoted && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                    Most Voted
                  </h3>
                  <FeaturedEventCard event={featured.mostVoted} variant="nextUp" />
                </div>
              )}

              {/* Minting Soon */}
              {featured?.nextUp && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                    Minting Soon
                  </h3>
                  <FeaturedEventCard event={featured.nextUp} variant="nextUp" />
                </div>
              )}

              {/* Top Forever Mint */}
              {featured?.topForeverMint && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Infinity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                    Top Forever Mint
                  </h3>
                  <FeaturedEventCard event={featured.topForeverMint} variant="foreverMint" />
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Top Collections */}
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <TopCollectionsPodium />
        </div>
      </section>

      {/* Top Tokens */}
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <TopTokensPodium />
        </div>
      </section>

      {/* Ecosystem Meetups - 2 columns: Most Voted | Next Upcoming */}
      {hasMeetups && (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
                Ecosystem Meetups
              </h2>
              <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-xs sm:text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {featured?.topMeetup && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 fill-yellow-400" />
                    Most Voted
                  </h3>
                  <EventColumnCard event={featured.topMeetup} icon={Users} />
                </div>
              )}
              {featured?.nextMeetup && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                    Next Upcoming
                  </h3>
                  <EventColumnCard event={featured.nextMeetup} icon={Users} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Hackathons - 3 columns: Most Voted | Next Upcoming | Biggest Prize */}
      {hasHackathons && (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
                <Code2 className="h-5 w-5 sm:h-6 sm:w-6 text-violet-500" />
                Hackathons
              </h2>
              <Link href="/calendar?eventType=HACKATHON" className="text-xs sm:text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {featured?.topHackathon && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 fill-yellow-400" />
                    Most Voted
                  </h3>
                  <EventColumnCard event={featured.topHackathon} icon={Code2} accentColor="violet-500" />
                </div>
              )}
              {featured?.nextHackathon && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                    Next Upcoming
                  </h3>
                  <EventColumnCard event={featured.nextHackathon} icon={Code2} accentColor="violet-500" />
                </div>
              )}
              {featured?.bigPrizeHackathon && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                    Biggest Prize
                  </h3>
                  <EventColumnCard event={featured.bigPrizeHackathon} icon={Code2} accentColor="violet-500" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
