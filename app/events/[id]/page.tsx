"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import {
  Calendar,
  Clock,
  ExternalLink,
  Twitter,
  Globe,
  Users,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Layers,
  AlertCircle,
  DollarSign,
  Trophy,
  Code2,
  Link2,
  Mic2,
  Award,
  Check,
  CalendarPlus,
  Pencil,
  Fish,
  Sparkles,
  Zap,
  TrendingUp,
  Infinity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { useWalletStore } from "@/store";
import { cn, parseMintPrice, getGoogleCalendarUrl } from "@/lib/utils";
import { mutate } from "@/lib/swr";
import { XIcon } from "@/components/ui/XIcon";
import { useVoteLimitContext } from "@/contexts/VoteLimitContext";
import { RequestHostModal } from "@/components/badges/RequestHostModal";
import { useBadgeStatus } from "@/lib/swr";

interface MintPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  price: string;
  maxPerWallet: number | null;
  supply: number | null;
  isWhitelist: boolean;
  order: number;
}

interface CustomLink {
  name: string;
  url: string;
}

interface AdjacentEvent {
  id: string;
  title: string;
  mintDate: string;
}

interface EventDetail {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  endDate: string | null;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  status: "UPCOMING" | "LIVE";
  votesUp: number;
  votesDown: number;
  event_type: "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";
  isForeverMint?: boolean;
  location?: string | null;
  prizes?: string | null;
  custom_links?: CustomLink[] | null;
  createdBy: {
    walletAddress: string;
  };
  phases: MintPhase[];
  userVote: "UP" | "DOWN" | null;
  canVote: boolean;
  canEdit?: boolean;
  voteLockedUntil: string | null;
  prevEvent?: AdjacentEvent | null;
  nextEvent?: AdjacentEvent | null;
  source?: string;
  metadata?: {
    dreamcast?: boolean;
    badge?: string | null;
    buybackEnabled?: boolean;
    tiers?: Record<string, number>;
    stats?: {
      totalCatches: number;
      totalVolume: string;
      buybackVolume?: string;
      keeperCatches?: number;
      krakenCatches?: number;
      totalBuybacks?: number;
      smallFryCatches?: number;
    };
    previews?: { image: string | null; tier: string; name?: string }[];
  } | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useWalletStore();
  const { showLimitReachedModal, refreshVoteLimit } = useVoteLimitContext();
  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [voting, setVoting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [voteCountdown, setVoteCountdown] = React.useState<string | null>(null);
  const [showHostModal, setShowHostModal] = React.useState(false);

  // Badge status - fetch for all event types to show badge differentiation
  const { data: badgeStatusData, mutate: mutateBadgeStatus } = useBadgeStatus(
    params.id as string
  );

  React.useEffect(() => {
    if (params.id) {
      loadEvent();
    }
  }, [params.id, isConnected]);

  // Update vote countdown timer
  React.useEffect(() => {
    if (!event?.voteLockedUntil) {
      setVoteCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const unlockTime = new Date(event.voteLockedUntil!).getTime();
      const diff = unlockTime - now;

      if (diff <= 0) {
        setVoteCountdown(null);
        loadEvent(); // Refresh to update canVote
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setVoteCountdown(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setVoteCountdown(`${minutes}m ${seconds}s`);
      } else {
        setVoteCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event?.voteLockedUntil]);

  async function loadEvent() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/events/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      } else if (response.status === 404) {
        setError("Event not found");
      } else {
        setError("Failed to load event");
      }
    } catch (err) {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(voteType: "UP" | "DOWN") {
    if (!isConnected) {
      alert("Please connect your wallet to vote");
      return;
    }

    try {
      setVoting(true);
      const response = await fetch(`/api/events/${params.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, useNftVotes: true }),
      });

      if (response.ok) {
        const data = await response.json();
        // Optimistic update: use vote API response immediately (no stale data)
        setEvent((prev: any) => prev ? {
          ...prev,
          votesUp: data.votesUp,
          votesDown: data.votesDown,
          userVote: voteType,
          canVote: false,
        } : prev);
        // Also refetch full event data in background
        loadEvent();
        // Invalidate all relevant SWR caches for real-time updates
        mutate("/api/events/featured");
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/events"), undefined, { revalidate: true });
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/forever-mints"), undefined, { revalidate: true });
        // Refresh vote limit in navbar
        refreshVoteLimit();
      } else if (response.status === 429) {
        // Daily vote limit reached - show modal
        showLimitReachedModal();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to vote");
      }
    } catch (err) {
      alert("Failed to vote");
    } finally {
      setVoting(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    const text = `Check out ${event?.title} on Hashly!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title, text, url });
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " UTC";
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " UTC";
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return "Started";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/15 text-green-400 border border-green-500/20 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE NOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-subtle text-brand border border-brand/20 rounded-full text-xs font-semibold">
            UPCOMING
          </span>
        );
    }
  };

  const getPhaseStatus = (phase: MintPhase) => {
    const now = new Date();
    const start = new Date(phase.startDate);
    const end = phase.endDate ? new Date(phase.endDate) : null;

    if (now < start) return "upcoming";
    if (end && now > end) return "ended";
    return "active";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-error" />
        <h1 className="text-2xl font-bold mb-2">{error || "Event not found"}</h1>
        <p className="text-text-secondary mb-4">The event you're looking for doesn't exist or has been removed.</p>
        <Link href="/calendar">
          <Button>Back to Calendar</Button>
        </Link>
      </div>
    );
  }

  const score = Math.max(0, event.votesUp) - Math.max(0, event.votesDown);
  const isDreamCast = event.metadata?.dreamcast === true;
  const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
  const isHackathon = event.event_type === "HACKATHON";
  const isStarsOnly = isMeetup || isHackathon; // Stars-only voting for meetups and hackathons
  const hasBadgeToken = badgeStatusData?.badge?.tokenId;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Calendar
        </Link>

        {/* Prev / Next */}
        <div className="flex items-center gap-1.5">
          {event.prevEvent ? (
            <Link
              href={`/events/${event.prevEvent.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border transition-colors"
              title={event.prevEvent.title}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary/30 border border-border/30 cursor-not-allowed select-none">
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </span>
          )}
          {event.nextEvent ? (
            <Link
              href={`/events/${event.nextEvent.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border transition-colors"
              title={event.nextEvent.title}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary/30 border border-border/30 cursor-not-allowed select-none">
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Header Card */}
          <div className={`bg-bg-card border border-border rounded-lg overflow-hidden`}>
            {event.imageUrl && (
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                {/* Date badge - top left */}
                <div className="absolute top-3 left-3">
                  {event.isForeverMint ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-bold rounded ${isDreamCast ? "bg-pink-500/90 text-white" : "bg-purple-500/90 text-white"}`}>
                      {isDreamCast ? <Fish className="h-3 w-3" /> : <Infinity className="h-3 w-3" />}
                      {isDreamCast ? "DreamCast" : "Always Live"}
                    </span>
                  ) : event.mintDate ? (
                    <span className="px-2 py-1 text-[10px] sm:text-xs bg-text-primary/90 text-bg-primary rounded">
                      {new Date(event.mintDate).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : null}
                </div>
                {/* Status badge - top right */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {hasBadgeToken && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent-coral/90 text-white text-[10px] sm:text-xs font-bold rounded backdrop-blur-sm">
                      <Award className="h-3 w-3" />
                      NFT Badge
                    </span>
                  )}
                  {!event.isForeverMint && getStatusBadge(event.status)}
                </div>
              </div>
            )}
            <div className={`p-4 sm:p-6 ${event.imageUrl ? "" : "pt-4 sm:pt-6"}`}>
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{event.title}</h1>
                  {hasBadgeToken && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-coral/15 border border-accent-coral/30 text-accent-coral text-[10px] sm:text-xs font-semibold">
                        <Award className="h-3 w-3" />
                        Attendance Badge NFT
                      </span>
                    </div>
                  )}
                </div>
                {!event.imageUrl && (
                  <div className="flex items-center gap-2">
                    {event.isForeverMint ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-bold rounded ${isDreamCast ? "bg-pink-500/90 text-white" : "bg-purple-500/90 text-white"}`}>
                        {isDreamCast ? <Fish className="h-3 w-3" /> : <Infinity className="h-3 w-3" />}
                        {isDreamCast ? "DreamCast" : "Always Live"}
                      </span>
                    ) : event.mintDate ? (
                      <span className="px-2 py-1 text-[10px] sm:text-xs bg-bg-secondary text-text-primary rounded">
                        {new Date(event.mintDate).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : null}
                    {!event.isForeverMint && getStatusBadge(event.status)}
                  </div>
                )}
              </div>

              <div
                className="text-text-secondary prose prose-sm prose-invert max-w-none [&>p]:mb-2 sm:[&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_strong]:text-text-primary [&_a]:text-brand [&_a]:underline text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] }) }}
              />

              {/* Links */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                {event.websiteUrl && (
                  <a
                    href={event.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-bg-secondary hover:bg-border transition-colors text-xs sm:text-sm font-medium"
                  >
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Website
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </a>
                )}
                {event.twitterUrl && (
                  <a
                    href={event.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-bg-secondary hover:bg-border transition-colors text-xs sm:text-sm font-medium"
                  >
                    <Twitter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Twitter
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </a>
                )}
                {event.discordUrl && (
                  <a
                    href={event.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-bg-secondary hover:bg-border transition-colors text-xs sm:text-sm font-medium"
                  >
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Discord
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </a>
                )}
                {/* Custom Links */}
                {event.custom_links && Array.isArray(event.custom_links) && event.custom_links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-bg-secondary hover:bg-border transition-colors text-xs sm:text-sm font-medium"
                  >
                    <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {link.name}
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Mint Phases - only for mint events */}
          {!isMeetup && !isHackathon && event.phases.length > 0 && (
            <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border">
                <h3 className="font-bold flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center">
                    <Layers className="h-4 w-4 text-purple-500" />
                  </div>
                  Mint Phases
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {event.phases
                  .sort((a, b) => a.order - b.order)
                  .map((phase, index) => {
                    const status = getPhaseStatus(phase);
                    return (
                      <div
                        key={phase.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          status === "active"
                            ? "bg-success/5 border-green-500/30"
                            : status === "ended"
                            ? "bg-bg-secondary border-border opacity-60"
                            : "bg-bg-secondary border-border"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{phase.name}</span>
                            {phase.isWhitelist && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded">WL</span>
                            )}
                            {status === "active" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded-full text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {(() => {
                            const phasePriceInfo = parseMintPrice(phase.price);
                            return (
                              <span className="text-lg font-bold text-brand flex items-center gap-1">
                                {phasePriceInfo.isHbar ? (
                                  <HbarIcon className="h-4 w-4" />
                                ) : (
                                  <UsdcIcon className="h-4 w-4" />
                                )}
                                {phasePriceInfo.value}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-text-secondary text-xs">Starts</p>
                            <p className="font-medium text-sm">{formatShortDate(phase.startDate)}</p>
                          </div>
                          {phase.endDate && (
                            <div>
                              <p className="text-text-secondary text-xs">Ends</p>
                              <p className="font-medium text-sm">{formatShortDate(phase.endDate)}</p>
                            </div>
                          )}
                          {phase.supply && (
                            <div>
                              <p className="text-text-secondary text-xs">Supply</p>
                              <p className="font-medium text-sm">{phase.supply.toLocaleString()}</p>
                            </div>
                          )}
                          {phase.maxPerWallet && (
                            <div>
                              <p className="text-text-secondary text-xs">Max/Wallet</p>
                              <p className="font-medium text-sm">{phase.maxPerWallet}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Event Info - News style */}
          <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {event.isForeverMint ? (
                /* Forever Mint / DreamCast: Always Live */
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${isDreamCast ? "bg-pink-500/10" : "bg-purple-500/10"}`}>
                    {isDreamCast ? (
                      <Fish className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400" />
                    ) : (
                      <Infinity className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-secondary">Availability</p>
                    <p className={`font-bold text-base sm:text-lg ${isDreamCast ? "text-pink-400" : "text-purple-400"}`}>
                      Always Live
                    </p>
                  </div>
                </div>
              ) : (
                /* Regular events: Date + Countdown */
                <>
                  {event.mintDate && (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 rounded bg-brand-subtle flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-secondary">{event.endDate ? "Start Date" : "Event Date"}</p>
                        <p className="font-medium text-sm sm:text-base whitespace-normal leading-tight">{formatDate(event.mintDate)}</p>
                      </div>
                    </div>
                  )}

                  {event.endDate && (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-secondary">End Date</p>
                        <p className="font-medium text-sm sm:text-base whitespace-normal leading-tight">{formatDate(event.endDate)}</p>
                      </div>
                    </div>
                  )}

                  {event.mintDate && (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">{isStarsOnly ? "Time Until Event" : "Time Until Mint"}</p>
                        <p className="font-bold text-base sm:text-lg">{getTimeUntil(event.mintDate)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isHackathon ? (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 rounded bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-secondary">Prizes</p>
                    <p className="font-bold text-base sm:text-lg truncate">
                      {event.prizes || "To be announced"}
                    </p>
                  </div>
                </div>
              ) : isMeetup ? (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 rounded bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Entry Price</p>
                    <p className="font-bold text-base sm:text-lg">
                      {!event.mintPrice || event.mintPrice === "0" || event.mintPrice.toLowerCase().includes("free")
                        ? "Free"
                        : `$${event.mintPrice}`}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const priceInfo = parseMintPrice(event.mintPrice);
                    return (
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-10 h-10 rounded bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                          {priceInfo.isHbar ? (
                            <HbarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <UsdcIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Mint Price</p>
                          <p className="font-bold text-base sm:text-lg">
                            {priceInfo.isHbar ? `${priceInfo.value} HBAR` : `$${priceInfo.value}`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {event.supply && (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Total Supply</p>
                        <p className="font-bold text-base sm:text-lg">{event.supply.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Voting - News style */}
          <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
                {isStarsOnly ? "Community Rating" : "Community Score"}
              </h3>
              <div className="text-center mb-3 sm:mb-4">
                {isStarsOnly ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 fill-yellow-400" />
                    <span className="text-3xl sm:text-4xl font-bold text-yellow-400">{event.votesUp}</span>
                  </div>
                ) : (
                  <span className={cn(
                    "text-3xl sm:text-4xl font-bold",
                    score > 0 ? "text-success" : score < 0 ? "text-error" : "text-text-secondary"
                  )}>
                    {score > 0 ? "+" : ""}{score}
                  </span>
                )}
              </div>

              {/* Connect wallet message */}
              {!isConnected && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-md bg-brand-subtle border border-border text-center">
                  <p className="text-xs sm:text-sm text-brand font-medium">
                    Connect wallet to {isStarsOnly ? "rate" : "vote"}
                  </p>
                </div>
              )}

              {/* Vote locked message - only show if connected */}
              {isConnected && event.userVote && !event.canVote && voteCountdown && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-md bg-orange-500/10 border border-orange-500/30 text-center">
                  <p className="text-xs sm:text-sm text-orange-500 font-medium">
                    {isStarsOnly ? "Rate" : "Vote"} again in {voteCountdown}
                  </p>
                </div>
              )}

              {isStarsOnly ? (
                <>
                  <Button
                    variant={event.userVote === "UP" && !event.canVote ? "default" : "secondary"}
                    onClick={() => handleVote("UP")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "w-full flex items-center justify-center gap-2",
                      event.userVote === "UP" && !event.canVote
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "hover:border-yellow-500/50",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Star className={cn("h-4 w-4", event.userVote === "UP" && !event.canVote && "fill-white")} />
                    {event.userVote === "UP" && !event.canVote ? "Starred" : "Give a Star"}
                  </Button>
                  {event.userVote === "UP" && (
                    <p className="text-center text-sm text-text-secondary mt-2">
                      {event.canVote ? "You can star again" : "You starred this event ⭐"}
                    </p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={event.userVote === "UP" && !event.canVote ? "default" : "secondary"}
                    onClick={() => handleVote("UP")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "flex items-center gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {Math.max(0, event.votesUp)}
                  </Button>
                  <Button
                    variant={event.userVote === "DOWN" && !event.canVote ? "default" : "secondary"}
                    onClick={() => handleVote("DOWN")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "flex items-center gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    {Math.max(0, event.votesDown)}
                  </Button>
                </div>
              )}

              {isConnected && event.userVote && !isStarsOnly && (
                <p className="text-xs text-text-secondary text-center mt-3">
                  {event.canVote ? "You can vote again" : `You voted ${event.userVote === "UP" ? "👍" : "👎"}`}
                </p>
              )}
            </div>
          </div>

          {/* Attendance Badge - only for meetups */}
          {isMeetup && (
            <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6">
                <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-accent-coral/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-accent-coral" />
                  </div>
                  Attendance Badge
                </h3>

                {badgeStatusData?.badge ? (
                  <div className="space-y-3">
                    {badgeStatusData.badge.status === "DISTRIBUTED" ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                        <Check className="h-4 w-4 text-success" />
                        <span className="text-sm text-success font-medium">
                          Badge distributed ({badgeStatusData.badge.supply} claimed)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-coral/10 border border-accent-coral/20">
                        <Mic2 className="h-4 w-4 text-accent-coral" />
                        <span className="text-sm text-accent-coral font-medium">
                          Badge in progress
                        </span>
                      </div>
                    )}
                    {badgeStatusData.badge.tokenId && (
                      <p className="text-xs text-text-secondary">
                        Token ID: <span className="">{badgeStatusData.badge.tokenId}</span>
                      </p>
                    )}
                  </div>
                ) : badgeStatusData?.hostRequest ? (
                  <div className="space-y-2">
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border",
                      badgeStatusData.hostRequest.status === "PENDING"
                        ? "bg-yellow-500/10 border-yellow-500/20"
                        : badgeStatusData.hostRequest.status === "APPROVED"
                          ? "bg-success/10 border-success/20"
                          : "bg-error/10 border-error/20"
                    )}>
                      <span className={cn(
                        "text-sm font-medium",
                        badgeStatusData.hostRequest.status === "PENDING"
                          ? "text-yellow-500"
                          : badgeStatusData.hostRequest.status === "APPROVED"
                            ? "text-success"
                            : "text-error"
                      )}>
                        {badgeStatusData.hostRequest.status === "PENDING"
                          ? "Host request pending..."
                          : badgeStatusData.hostRequest.status === "APPROVED"
                            ? "You can create badge!"
                            : "Request rejected"}
                      </span>
                    </div>
                    {badgeStatusData.hostRequest.status === "APPROVED" && (
                      <Link href={`/profile/badges/${event.id}`}>
                        <Button size="sm" className="w-full">
                          <Mic2 className="h-4 w-4 mr-2" />
                          Create Badge
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      No attendance badge yet. Become the host to create one!
                    </p>
                    {isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-accent-coral text-accent-coral hover:bg-accent-coral/10"
                        onClick={() => setShowHostModal(true)}
                      >
                        <Mic2 className="h-4 w-4 mr-2" />
                        Request to Host
                      </Button>
                    ) : (
                      <p className="text-xs text-text-secondary text-center">
                        Connect wallet to request hosting
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Button - only visible to creator/admin */}
          {event.canEdit && (
            <Link
              href={`/events/${event.id}/edit`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-brand-subtle border border-border text-brand hover:bg-bg-secondary transition-colors text-sm font-medium"
            >
              <Pencil className="h-4 w-4" />
              Edit Event
            </Link>
          )}

          {/* Share */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 text-sm"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Share
            </Button>
            {!event.isForeverMint && (
              <Button
                variant="secondary"
                className="px-3 sm:px-4"
                title="Add to Google Calendar"
                onClick={() => {
                  window.open(
                    getGoogleCalendarUrl({
                      title: event.title,
                      description: event.description,
                      mintDate: event.mintDate,
                      endDate: event.endDate,
                      location: event.location,
                      id: event.id,
                    }),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <CalendarPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              className="px-3 sm:px-4"
              onClick={() => {
                const text = `Check out ${event.title} on @hashly_h 🗓️\n\nDiscover events on Hedera!`;
                const url = `https://hash-ly.com/events/${event.id}`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                  "-blank",
                  "noopener,noreferrer,width=550,height=420"
                );
              }}
            >
              <XIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Submitted By */}
          <p className="text-[10px] sm:text-xs text-text-secondary text-center truncate px-2">
            Submitted by {event.createdBy.walletAddress}
          </p>
        </div>
      </div>

      {/* DreamCast Pool Details - Full width */}
      {isDreamCast && event.metadata && (
        <DreamCastDetails metadata={event.metadata} />
      )}

      {/* Host Request Modal */}
      {isMeetup && (
        <RequestHostModal
          isOpen={showHostModal}
          onClose={() => setShowHostModal(false)}
          eventId={event.id}
          eventTitle={event.title}
          onSuccess={() => mutateBadgeStatus()}
        />
      )}
    </div>
  );
}

// ─── DreamCast Details Component ───

const TIER_STYLES: Record<string, { color: string; bg: string; border: string; text: string }> = {
  kraken: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "Kraken" },
  hydra: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", text: "Hydra" },
  siren: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "Siren" },
  keeper: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "Keeper" },
  smallFry: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "Small Fry" },
};

const DEFAULT_TIER = { color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", text: "" };

function getTierStyle(tier: string) {
  return TIER_STYLES[tier] || { ...DEFAULT_TIER, text: tier.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim() };
}

function DreamCastDetails({ metadata }: { metadata: NonNullable<EventDetail["metadata"]> }) {
  const tiers = metadata.tiers || {};
  const stats = metadata.stats;
  const previews = metadata.previews || [];
  const totalSlots = Object.values(tiers).reduce((sum, count) => sum + count, 0);

  const hasTiers = Object.keys(tiers).length > 0;
  const hasStats = stats && stats.totalCatches > 0;
  const hasPreviews = previews.length > 0;

  return (
    <div className="bg-bg-card border border-pink-500/20 rounded-lg overflow-hidden mt-4 sm:mt-6">
      <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-pink-500/10 flex items-center justify-center">
          <Fish className="h-4 w-4 text-pink-400" />
        </div>
        <h3 className="font-bold">DreamCast Pool</h3>
        {metadata.badge === "official" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            Official
          </span>
        )}
      </div>

      {/* Horizontal layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Tier Distribution */}
        {hasTiers && (
          <div className="p-4 sm:p-5">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Pool Tiers</h4>
            <div className="space-y-2.5">
              {Object.entries(tiers)
                .sort(([, a], [, b]) => a - b)
                .map(([tier, count]) => {
                  const style = getTierStyle(tier);
                  const percentage = totalSlots > 0 ? (count / totalSlots) * 100 : 0;
                  return (
                    <div key={tier} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${style.color}`}>{style.text || tier}</span>
                        <span className="text-text-secondary text-xs">
                          {count} <span className="text-text-secondary/50">({percentage.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${style.bg} border ${style.border}`}
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <p className="text-[10px] text-text-secondary mt-2.5">{totalSlots} total slots</p>
          </div>
        )}

        {/* Stats */}
        {hasStats && (
          <div className="p-4 sm:p-5">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Pool Stats</h4>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3.5 w-3.5 text-pink-400" />
                  <span className="text-xs text-text-secondary">Total Catches</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{stats.totalCatches.toLocaleString()}</p>
              </div>
              {stats.totalVolume && parseInt(stats.totalVolume) > 0 && (
                <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-pink-400" />
                    <span className="text-xs text-text-secondary">Total Volume</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary">
                    {(parseInt(stats.totalVolume) / 100_000_000).toLocaleString()} <span className="text-sm text-text-secondary">HBAR</span>
                  </p>
                </div>
              )}
              {metadata.buybackEnabled && stats.totalBuybacks !== undefined && stats.totalBuybacks > 0 && (
                <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-text-secondary">Buybacks</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary">{stats.totalBuybacks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NFT Previews */}
        {hasPreviews && (
          <div className="p-4 sm:p-5">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Pool Previews</h4>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, i) => {
                const style = getTierStyle(preview.tier);
                return (
                  <div key={i} className={`rounded-lg overflow-hidden border ${style.border} bg-bg-secondary`}>
                    {preview.image ? (
                      <img
                        src={preview.image}
                        alt={preview.name || `${preview.tier} #${i + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-bg-secondary">
                        <Fish className={`h-6 w-6 ${style.color}`} />
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="text-[10px] font-medium text-text-primary truncate">{preview.name || preview.tier}</p>
                      <span className={`text-[9px] ${style.color} font-medium`}>{style.text || preview.tier}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
