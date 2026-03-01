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
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { TopCollectionsPodium } from "@/components/collections/TopCollectionsPodium";
import { TopTokensPodium } from "@/components/tokens/TopTokensPodium";
import { useWalletStore } from "@/store";
import { useFeatured, useHomeAds, useEventsWithBadge } from "@/lib/swr";
import { formatDate, cn } from "@/lib/utils";
import { HomeAdCarousel } from "@/components/ads/HomeAdCarousel";

// Reusable event card for meetup/hackathon sections
function EventColumnCard({ event, icon: Icon, accentColor = "accent-primary" }: { event: any; icon: any; accentColor?: string }) {
  const isLive = event.status === "LIVE";

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
      <div className="relative h-full rounded-xl overflow-hidden bg-bg-card border border-border/50 hover:border-accent-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/5">
        <div className="relative aspect-video bg-bg-secondary overflow-hidden">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
              <Icon className="h-10 w-10 text-text-secondary/20" />
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Status pill */}
          <div className="absolute top-2.5 right-2.5">
            {isLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wide",
                accentColor === "violet-500" ? "bg-violet-500/90" : "bg-accent-primary/90"
              )}>
                UPCOMING
              </span>
            )}
          </div>

          {/* Overlaid info on image bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center gap-2 text-[10px] text-white/80">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
              {timeUntil && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded-full">
                  <Clock className="h-2.5 w-2.5" />
                  {timeUntil}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col gap-2">
          {event.host && (
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary/70">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                accentColor === "violet-500" ? "bg-violet-500" : "bg-accent-primary"
              )} />
              <span className="truncate">{event.host}</span>
            </div>
          )}

          <h4 className="font-bold text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-snug">
            {event.title}
          </h4>

          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {event.location_type === "IN_PERSON" && event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </span>
            )}
          </div>

          {event.prizes && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-500/10 rounded-lg">
              <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-400 line-clamp-1">{event.prizes}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-500">{event.votesUp}</span>
            </div>
            <span className="text-[11px] font-medium text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
              details <span className="group-hover:translate-x-0.5 transition-transform">→</span>
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

  const { data: eventsWithBadgeData } = useEventsWithBadge(4);
  const eventsWithBadge = eventsWithBadgeData?.events || [];
  const hasEventsWithBadge = eventsWithBadge.length > 0;

  const hasFeaturedEvents = featured?.mostVoted || featured?.mostVotedLive || featured?.nextUp;
  const hasMeetups = featured?.topMeetup || featured?.nextMeetup;
  const hasHackathons = featured?.topHackathon || featured?.nextHackathon || featured?.bigPrizeHackathon;

  return (
    <div className="min-h-screen">

      {/* ── Hero: Title+HowItWorks left, Ad right ── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className={`grid ${hasAds ? "lg:grid-cols-[4fr_5fr]" : "lg:grid-cols-1 max-w-3xl mx-auto"} gap-6 lg:gap-8 items-center`}>
            {/* Left: Title + CTA + How It Works stacked */}
            <div className="space-y-4 sm:space-y-5">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
                  Discover Hedera
                </h1>
                <p className="text-sm sm:text-base text-text-secondary">
                  Events, NFTs & Community Rankings
                </p>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-3">
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

              {/* How It Works — vertical cards below title */}
              <div className="space-y-2">
                <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-bg-card border border-border/50 rounded-xl hover:border-accent-primary/30 transition-all group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                    <Vote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors">Community Voting</h3>
                    <p className="text-text-secondary text-[10px] sm:text-xs leading-relaxed">Connect your wallet to vote and help discover quality projects.</p>
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-bg-card border border-border/50 rounded-xl hover:border-yellow-500/30 transition-all group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden flex-shrink-0">
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

                <div className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 bg-bg-card border border-border/50 rounded-xl hover:border-purple-500/30 transition-all group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden flex-shrink-0">
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
            </div>

            {/* Right: Ad Carousel (big) */}
            {hasAds && (
              <div className="h-56 sm:h-64 lg:h-full lg:min-h-[360px]">
                <HomeAdCarousel ads={homeAds} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Attendance Badges ── */}
      {hasEventsWithBadge && (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                Attendance Badges
              </h2>
              <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-xs sm:text-sm text-accent-primary hover:underline">
                View all meetups
              </Link>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Events with claimable NFT badges for attendees. Collect them all and earn bonus leaderboard points!
            </p>
            <div className={`grid gap-3 sm:gap-4 ${
              eventsWithBadge.length === 1
                ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                : eventsWithBadge.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : eventsWithBadge.length === 3
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            }`}>
              {eventsWithBadge.map((event: any) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block group">
                  <div className="relative h-full bg-bg-card overflow-hidden transition-all duration-200 border border-border/50 rounded-xl hover:border-purple-500/30">
                    <div className="relative aspect-video bg-bg-secondary overflow-hidden">
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
                          <Award className="h-8 w-8 sm:h-10 sm:w-10 text-text-secondary/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/90 rounded text-white text-xs font-semibold">
                          <Award className="h-3 w-3" />
                          <span>NFT Badge</span>
                        </div>
                      </div>
                      {event.badge?.supply && (
                        <div className="absolute bottom-2 right-2">
                          <div className="px-2 py-1 bg-black/70 rounded text-white text-xs">
                            {event.badge.supply} claimed
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col border-t border-border">
                      {event.host && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary/70 mb-1">
                          <span className="w-1 h-1 rounded-full bg-purple-500" />
                          <span className="truncate">{event.host}</span>
                        </div>
                      )}
                      <h4 className="font-bold text-text-primary mb-1 line-clamp-1 group-hover:text-purple-500 transition-colors text-sm leading-tight">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(new Date(event.mintDate).toISOString())}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-bold text-yellow-500">{event.votesUp}</span>
                        </div>
                        <span className="text-xs text-text-secondary group-hover:text-purple-500 transition-colors flex items-center gap-1">
                          claim badge <span className="group-hover:translate-x-1 transition-transform"></span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NFT Events ── */}
      {loading ? (
        <section className="py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          </div>
        </section>
      ) : hasFeaturedEvents ? (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">
                NFT Events
              </h2>
              <Link href="/calendar" className="text-xs sm:text-sm text-accent-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {featured?.mostVotedLive && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                    Live Now
                  </h3>
                  <FeaturedEventCard event={featured.mostVotedLive} variant="nextUp" />
                </div>
              )}
              {featured?.mostVoted && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                    Most Voted
                  </h3>
                  <FeaturedEventCard event={featured.mostVoted} variant="nextUp" />
                </div>
              )}
              {featured?.nextUp && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                    Minting Soon
                  </h3>
                  <FeaturedEventCard event={featured.nextUp} variant="nextUp" />
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Top Collections ── */}
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <TopCollectionsPodium />
        </div>
      </section>

      {/* ── Top Tokens ── */}
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <TopTokensPodium />
        </div>
      </section>

      {/* ── Ecosystem Meetups & Hackathons ── */}
      {(hasMeetups || hasHackathons) && (
        <section className="py-4 sm:py-6 lg:py-8">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {hasMeetups && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
                      <Users className="h-5 w-5 text-accent-primary" />
                      Ecosystem Meetups
                    </h2>
                    <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-xs sm:text-sm text-accent-primary hover:underline">
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featured?.topMeetup && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-400 fill-yellow-400" />
                          Most Voted
                        </h3>
                        <EventColumnCard event={featured.topMeetup} icon={Users} />
                      </div>
                    )}
                    {featured?.nextMeetup && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400" />
                          Next Upcoming
                        </h3>
                        <EventColumnCard event={featured.nextMeetup} icon={Users} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {hasHackathons && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
                      <Code2 className="h-5 w-5 text-violet-500" />
                      Hackathons
                    </h2>
                    <Link href="/calendar?eventType=HACKATHON" className="text-xs sm:text-sm text-accent-primary hover:underline">
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featured?.topHackathon && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-400 fill-yellow-400" />
                          Most Voted
                        </h3>
                        <EventColumnCard event={featured.topHackathon} icon={Code2} accentColor="violet-500" />
                      </div>
                    )}
                    {featured?.nextHackathon && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400" />
                          Next Upcoming
                        </h3>
                        <EventColumnCard event={featured.nextHackathon} icon={Code2} accentColor="violet-500" />
                      </div>
                    )}
                    {featured?.bigPrizeHackathon && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1.5 flex items-center gap-1.5">
                          <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                          Biggest Prize
                        </h3>
                        <EventColumnCard event={featured.bigPrizeHackathon} icon={Code2} accentColor="violet-500" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
