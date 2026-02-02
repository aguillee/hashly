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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { TopCollectionsPodium } from "@/components/collections/TopCollectionsPodium";
import { useWalletStore } from "@/store";
import { useFeatured } from "@/lib/swr";
import { formatDate } from "@/lib/utils";

// Reusable event card for meetup/hackathon 3-column sections
function EventColumnCard({ event, icon: Icon, accentColor = "accent-primary" }: { event: any; icon: any; accentColor?: string }) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="relative h-full rounded-xl overflow-hidden border border-border bg-bg-card hover:border-accent-primary/30 transition-all">
        {/* Image area */}
        <div className="relative h-32 sm:h-36 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className={`h-10 w-10 text-${accentColor}/40`} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
          {/* Stars badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">{event.votesUp}</span>
          </div>
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            {event.status === "LIVE" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/90 text-white text-[10px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-primary/90 text-white text-[10px] font-medium">
                Upcoming
              </span>
            )}
          </div>
        </div>
        {/* Content */}
        <div className="p-3">
          <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
            {event.title}
          </h4>
          {event.host && (
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{event.host}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
            {event.mintDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {event.location_type === "IN_PERSON" && event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
          {/* Show prizes if available */}
          {event.prizes && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30">
              <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-bold text-amber-400 line-clamp-1">{event.prizes}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { isConnected } = useWalletStore();
  const { data: featured, isLoading: loading } = useFeatured();

  const hasFeaturedEvents = featured?.mostVoted || featured?.nextUp || featured?.topForeverMint;
  const hasMeetups = featured?.topMeetup || featured?.nextMeetup;
  const hasHackathons = featured?.topHackathon || featured?.nextHackathon || featured?.bigPrizeHackathon;

  return (
    <div className="min-h-screen">
      {/* Hero + How It Works - Combined compact section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Hero: 2 columns on desktop */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Title + CTA */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                <span className="gradient-text">Discover Hedera</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 mb-5">
                Explore events, collections, and meetups. Vote on your favorites and see what the community ranks at the top.
              </p>
              <div className="flex items-center justify-center lg:justify-start">
                {isConnected ? (
                  <Link href="/events/new">
                    <Button size="xl" className="gap-2 group px-8 shadow-xl shadow-accent-primary/30 hover:shadow-2xl hover:shadow-accent-primary/40 hover:scale-[1.03] transition-all duration-300">
                      <Plus className="h-5 w-5" />
                      Submit an Event
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button size="xl" className="gap-2 px-8" disabled>
                    <Plus className="h-5 w-5" />
                    Connect Wallet to Submit
                  </Button>
                )}
              </div>

              {/* Collaborate CTA - llamativo */}
              <a
                href="https://x.com/hashly_h"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-gradient-to-r from-accent-primary/15 to-accent-secondary/15 border border-accent-primary/30 hover:border-accent-primary/60 transition-all group"
              >
                <span className="text-sm text-text-secondary">Want to collaborate?</span>
                <span className="text-sm font-semibold text-accent-primary group-hover:underline flex items-center gap-1">
                  Contact us on X <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </div>

            {/* Right: How It Works - compact cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">How It Works</h2>

              <div className="flex gap-3 p-3 rounded-xl bg-bg-card/80 border border-border hover:border-accent-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                  <Vote className="h-4 w-4 text-accent-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">Community Voting</h3>
                  <p className="text-text-secondary text-xs">Connect your wallet to vote and help discover quality projects.</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-bg-card/80 border border-border hover:border-accent-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8" alt="Santuario Hedera" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">Santuario Hedera</h3>
                    <a href="https://sentx.io/nft-marketplace/0.0.7235629" target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline flex-shrink-0">SentX ↗</a>
                  </div>
                  <p className="text-text-secondary text-xs">
                    <span className="text-accent-primary font-semibold">+1 vote per dragon</span> per project you vote on.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-bg-card/80 border border-border hover:border-accent-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="https://launchpad-assets.kabila.app/logo/0.0.9954622/JPLTxQfsoC/logo.png" alt="El Santuario" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">El Santuario</h3>
                    <a href="https://sentx.io/nft-marketplace/0.0.9954622" target="_blank" rel="noopener noreferrer" className="text-xs text-accent-secondary hover:underline flex-shrink-0">SentX ↗</a>
                  </div>
                  <p className="text-text-secondary text-xs">
                    <span className="text-accent-secondary font-semibold">+5 votes per project</span> plus auto-approval.
                  </p>
                </div>
              </div>
            </div>
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
        <section className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                NFT Events
              </h2>
              <Link href="/calendar" className="text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Most Voted */}
              {featured?.mostVoted && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    Most Voted
                  </h3>
                  <FeaturedEventCard event={featured.mostVoted} variant="nextUp" />
                </div>
              )}

              {/* Minting Soon */}
              {featured?.nextUp && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    Minting Soon
                  </h3>
                  <FeaturedEventCard event={featured.nextUp} variant="nextUp" />
                </div>
              )}

              {/* Top Forever Mint */}
              {featured?.topForeverMint && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Infinity className="h-4 w-4 text-purple-400" />
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
      <section className="py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TopCollectionsPodium />
        </div>
      </section>

      {/* Ecosystem Meetups - 2 columns: Most Voted | Next Upcoming */}
      {hasMeetups && (
        <section className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
                <Users className="h-6 w-6 text-accent-primary" />
                Ecosystem Meetups
              </h2>
              <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featured?.topMeetup && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    Most Voted
                  </h3>
                  <EventColumnCard event={featured.topMeetup} icon={Users} />
                </div>
              )}
              {featured?.nextMeetup && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
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
        <section className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
                <Code2 className="h-6 w-6 text-violet-500" />
                Hackathons
              </h2>
              <Link href="/calendar?eventType=HACKATHON" className="text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured?.topHackathon && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    Most Voted
                  </h3>
                  <EventColumnCard event={featured.topHackathon} icon={Code2} accentColor="violet-500" />
                </div>
              )}
              {featured?.nextHackathon && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    Next Upcoming
                  </h3>
                  <EventColumnCard event={featured.nextHackathon} icon={Code2} accentColor="violet-500" />
                </div>
              )}
              {featured?.bigPrizeHackathon && (
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" />
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
