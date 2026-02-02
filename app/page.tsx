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
  Globe,
  Users,
  Clock,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { ForeverMintsSection } from "@/components/events/ForeverMintsSection";
import { TopCollectionsPodium } from "@/components/collections/TopCollectionsPodium";
import { useWalletStore } from "@/store";
import { useFeatured } from "@/lib/swr";
import { formatDate } from "@/lib/utils";

// Reusable small event card for meetups/hackathons sidebar lists
function SmallEventCard({ event, icon: Icon }: { event: any; icon: any }) {
  return (
    <Link href={`/events/${event.id}`}>
      <div className="group flex gap-3 p-2.5 rounded-xl border border-border bg-bg-card hover:border-accent-primary/30 transition-all">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="h-5 w-5 text-accent-primary/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
            {event.title}
          </h4>
          {event.mintDate && (
            <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(new Date(event.mintDate).toISOString())}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{event.votesUp}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Reusable big featured card for top meetup/hackathon
function BigFeaturedCard({ event, icon: Icon, label }: { event: any; icon: any; label: string }) {
  return (
    <Link href={`/events/${event.id}`} className="lg:col-span-3">
      <div className="group relative h-full rounded-2xl overflow-hidden border border-border bg-bg-card hover:border-accent-primary/30 transition-all">
        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="h-14 w-14 text-accent-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">{event.votesUp}</span>
          </div>
          <div className="absolute top-3 left-3">
            {event.status === "LIVE" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success/90 text-white text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-primary/90 text-white text-xs font-medium">
                Upcoming
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
            {event.title}
          </h3>
          {event.host && (
            <p className="text-sm text-text-secondary mt-0.5">{label} {event.host}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
            {event.mintDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {event.location_type === "IN_PERSON" && event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </span>
            )}
            {event.location_type === "ONLINE" && (
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Online
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { isConnected } = useWalletStore();
  const { data: featured, isLoading: loading } = useFeatured();

  const hasFeaturedEvents = featured?.mostVoted || featured?.nextUp || featured?.topForeverMint;
  const hasMeetups = featured?.topMeetup || (featured?.nextMeetups && featured.nextMeetups.length > 0);
  const hasHackathons = featured?.topHackathon || (featured?.nextHackathons && featured.nextHackathons.length > 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="gradient-text">Discover Hedera</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-2xl mx-auto mb-6 sm:mb-8">
              Explore events, collections, and meetups. Vote on your favorites and see what the community ranks at the top.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              {isConnected ? (
                <Link href="/events/new" className="w-full sm:w-auto">
                  <Button size="xl" className="gap-2 group w-full sm:w-auto">
                    <Plus className="h-5 w-5" />
                    Submit an Event
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <Button size="xl" className="gap-2 w-full sm:w-auto" disabled>
                  <Plus className="h-5 w-5" />
                  Connect Wallet to Submit
                </Button>
              )}
              <Link href="/calendar" className="w-full sm:w-auto">
                <Button variant="secondary" size="xl" className="gap-2 w-full sm:w-auto">
                  <Calendar className="h-5 w-5" />
                  Browse Calendar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Collaborate CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center">
        <p className="text-sm text-text-secondary">
          Want to collaborate with Hashly?{" "}
          <a
            href="https://x.com/hashly_h"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            Contact us on X
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      {/* How It Works Section */}
      <section className="py-6 sm:py-10 bg-bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-5 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary mb-2">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-sm sm:text-base">
              Community members vote on events to help surface the best projects.
              Hold special NFTs to unlock bonus voting power.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-card border border-border hover:border-accent-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-3">
                <Vote className="h-5 w-5 text-accent-primary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">Community Voting</h3>
              <p className="text-text-secondary text-sm">
                Connect your wallet to vote on upcoming events. Your votes help the community discover quality projects.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-bg-card border border-border hover:border-accent-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl overflow-hidden mb-3">
                <img
                  src="https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8"
                  alt="Santuario Hedera"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">Santuario Hedera</h3>
              <p className="text-text-secondary text-sm mb-2">
                Hold dragons to get{" "}
                <span className="text-accent-primary font-semibold">+1 vote per dragon</span>{" "}
                per project.
              </p>
              <a
                href="https://sentx.io/nft-marketplace/0.0.7235629"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
              >
                View on SentX <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-bg-card border border-border hover:border-accent-secondary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl overflow-hidden mb-3">
                <img
                  src="https://launchpad-assets.kabila.app/logo/0.0.9954622/JPLTxQfsoC/logo.png"
                  alt="El Santuario"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">El Santuario</h3>
              <p className="text-text-secondary text-sm mb-2">
                Hold an El Santuario NFT to get{" "}
                <span className="text-accent-secondary font-semibold">+5 votes per project</span>{" "}
                plus auto-approval.
              </p>
              <a
                href="https://sentx.io/nft-marketplace/0.0.9954622"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-secondary hover:underline"
              >
                View on SentX <ExternalLink className="h-3 w-3" />
              </a>
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
                Featured Events
              </h2>
              <Link href="/calendar" className="text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Most Voted */}
              {featured?.mostVoted && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    Most Voted
                  </h3>
                  <FeaturedEventCard event={featured.mostVoted} variant="nextUp" />
                </div>
              )}

              {/* Minting Soon */}
              {featured?.nextUp && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    Minting Soon
                  </h3>
                  <FeaturedEventCard event={featured.nextUp} variant="nextUp" />
                </div>
              )}

              {/* Top Forever Mint */}
              {featured?.topForeverMint && (
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
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

      {/* Ecosystem Meetups */}
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
            <div className="grid lg:grid-cols-5 gap-4">
              {featured?.topMeetup && (
                <BigFeaturedCard event={featured.topMeetup} icon={Users} label="Hosted by" />
              )}
              {featured?.nextMeetups && featured.nextMeetups.length > 0 && (
                <div className={`${featured.topMeetup ? 'lg:col-span-2' : 'lg:col-span-5'} flex flex-col gap-3`}>
                  {featured.nextMeetups.map((meetup: any) => (
                    <SmallEventCard key={meetup.id} event={meetup} icon={Users} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Hackathons */}
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
            <div className="grid lg:grid-cols-5 gap-4">
              {featured?.topHackathon && (
                <BigFeaturedCard event={featured.topHackathon} icon={Code2} label="Organized by" />
              )}
              {featured?.nextHackathons && featured.nextHackathons.length > 0 && (
                <div className={`${featured.topHackathon ? 'lg:col-span-2' : 'lg:col-span-5'} flex flex-col gap-3`}>
                  {featured.nextHackathons.map((hackathon: any) => (
                    <SmallEventCard key={hackathon.id} event={hackathon} icon={Code2} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Forever Mints Section */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ForeverMintsSection />
        </div>
      </section>

    </div>
  );
}
