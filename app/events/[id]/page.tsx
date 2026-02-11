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
  Loader2,
  Layers,
  AlertCircle,
  DollarSign,
  Trophy,
  Code2,
  Link2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { useWalletStore } from "@/store";
import { cn, parseMintPrice } from "@/lib/utils";
import { mutate } from "@/lib/swr";
import { XIcon } from "@/components/ui/XIcon";

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
  prizes?: string | null;
  custom_links?: CustomLink[] | null;
  createdBy: {
    walletAddress: string;
  };
  phases: MintPhase[];
  userVote: "UP" | "DOWN" | null;
  canVote: boolean;
  voteLockedUntil: string | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useWalletStore();
  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [voting, setVoting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [voteCountdown, setVoteCountdown] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (params.id) {
      loadEvent();
    }
  }, [params.id]);

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
        await loadEvent();
        // Invalidate featured and forever mints cache so homepage updates
        mutate("/api/events/featured");
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/forever-mints"), undefined, { revalidate: true });
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
          <span className="skew-tag inline-block px-2 py-0.5 bg-green-600 text-white text-[10px] sm:text-xs font-bold tracking-wide">
            <span>LIVE NOW</span>
          </span>
        );
      default:
        return (
          <span className="skew-tag inline-block px-2 py-0.5 bg-accent-primary text-white text-[10px] sm:text-xs font-bold tracking-wide">
            <span>UPCOMING</span>
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
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-error" />
        <h1 className="text-2xl font-bold mb-2">{error || "Event not found"}</h1>
        <p className="text-text-secondary mb-4">The event you're looking for doesn't exist or has been removed.</p>
        <Link href="/">
          <Button>Back to Calendar</Button>
        </Link>
      </div>
    );
  }

  const score = event.votesUp - event.votesDown;
  const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
  const isHackathon = event.event_type === "HACKATHON";
  const isStarsOnly = isMeetup || isHackathon; // Stars-only voting for meetups and hackathons

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 sm:mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calendar
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Header Card - News style with border-l-4 */}
          <div className={`bg-bg-card/80 border-l-4 rounded-r-md overflow-hidden ${event.status === "LIVE" ? "border-green-500" : "border-accent-primary"}`}>
            {event.imageUrl && (
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                {/* Date badge - top left */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 text-[10px] sm:text-xs font-mono bg-text-primary/90 text-bg-primary rounded">
                    {formatDate(event.mintDate).split(",")[0]}
                  </span>
                </div>
                {/* Status badge - top right */}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(event.status)}
                </div>
              </div>
            )}
            <div className={`p-4 sm:p-6 ${event.imageUrl ? "" : "pt-4 sm:pt-6"}`}>
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{event.title}</h1>
                </div>
                {!event.imageUrl && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-[10px] sm:text-xs font-mono bg-bg-secondary text-text-primary rounded">
                      {formatDate(event.mintDate).split(",")[0]}
                    </span>
                    {getStatusBadge(event.status)}
                  </div>
                )}
              </div>

              <div
                className="text-text-secondary prose prose-sm prose-invert max-w-none [&>p]:mb-2 sm:[&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_strong]:text-text-primary [&_a]:text-accent-primary [&_a]:underline text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] }) }}
              />

              {/* Links */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-dashed border-border/50">
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
            <div className="bg-bg-card/80 border-l-4 border-purple-500 rounded-r-md overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-dashed border-border/50">
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
                          "p-4 rounded-md border-l-2",
                          status === "active"
                            ? "bg-success/5 border-l-green-500"
                            : status === "ended"
                            ? "bg-bg-secondary border-l-border opacity-60"
                            : "bg-bg-secondary/50 border-l-accent-primary"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{phase.name}</span>
                            {phase.isWhitelist && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded">WL</span>
                            )}
                            {status === "active" && (
                              <span className="skew-tag inline-block px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold tracking-wide">
                                <span>ACTIVE</span>
                              </span>
                            )}
                          </div>
                          {(() => {
                            const phasePriceInfo = parseMintPrice(phase.price);
                            return (
                              <span className="text-lg font-bold text-accent-primary flex items-center gap-1 font-mono">
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
                            <p className="font-medium font-mono text-sm">{formatShortDate(phase.startDate)}</p>
                          </div>
                          {phase.endDate && (
                            <div>
                              <p className="text-text-secondary text-xs">Ends</p>
                              <p className="font-medium font-mono text-sm">{formatShortDate(phase.endDate)}</p>
                            </div>
                          )}
                          {phase.supply && (
                            <div>
                              <p className="text-text-secondary text-xs">Supply</p>
                              <p className="font-medium font-mono text-sm">{phase.supply.toLocaleString()}</p>
                            </div>
                          )}
                          {phase.maxPerWallet && (
                            <div>
                              <p className="text-text-secondary text-xs">Max/Wallet</p>
                              <p className="font-medium font-mono text-sm">{phase.maxPerWallet}</p>
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
          <div className="bg-bg-card/80 border-l-4 border-accent-primary rounded-r-md overflow-hidden">
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 rounded bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-accent-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">{event.endDate ? "Start Date" : "Event Date"}</p>
                  <p className="font-medium text-sm sm:text-base font-mono truncate">{formatDate(event.mintDate)}</p>
                </div>
              </div>

              {event.endDate && (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary">End Date</p>
                    <p className="font-medium text-sm sm:text-base font-mono truncate">{formatDate(event.endDate)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">{isStarsOnly ? "Time Until Event" : "Time Until Mint"}</p>
                  <p className="font-bold text-base sm:text-lg font-mono">{getTimeUntil(event.mintDate)}</p>
                </div>
              </div>

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
                    <p className="font-bold text-base sm:text-lg font-mono">
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
                          <p className="font-bold text-base sm:text-lg font-mono">
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
                        <p className="font-bold text-base sm:text-lg font-mono">{event.supply.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Voting - News style */}
          <div className="bg-bg-card/80 border-l-4 border-yellow-500 rounded-r-md overflow-hidden">
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
                    <span className="text-3xl sm:text-4xl font-bold text-yellow-400 font-mono">{event.votesUp}</span>
                  </div>
                ) : (
                  <span className={cn(
                    "text-3xl sm:text-4xl font-bold font-mono",
                    score > 0 ? "text-success" : score < 0 ? "text-error" : "text-text-secondary"
                  )}>
                    {score > 0 ? "+" : ""}{score}
                  </span>
                )}
              </div>

              {/* Connect wallet message */}
              {!isConnected && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-md bg-accent-primary/10 border border-accent-primary/30 text-center">
                  <p className="text-xs sm:text-sm text-accent-primary font-medium">
                    Connect wallet to {isStarsOnly ? "rate" : "vote"}
                  </p>
                </div>
              )}

              {/* Vote locked message - only show if connected */}
              {isConnected && event.userVote && !event.canVote && voteCountdown && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-md bg-orange-500/10 border border-orange-500/30 text-center">
                  <p className="text-xs sm:text-sm text-orange-500 font-medium font-mono">
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
                  {event.userVote === "UP" && !event.canVote && (
                    <p className="text-center text-sm text-text-secondary mt-2">
                      You starred this event ⭐
                    </p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={event.userVote === "UP" ? "default" : "secondary"}
                    onClick={() => handleVote("UP")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "flex items-center gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {event.votesUp}
                  </Button>
                  <Button
                    variant={event.userVote === "DOWN" ? "default" : "secondary"}
                    onClick={() => handleVote("DOWN")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "flex items-center gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    {event.votesDown}
                  </Button>
                </div>
              )}

              {isConnected && event.userVote && !isStarsOnly && (
                <p className="text-xs text-text-secondary text-center mt-3">
                  You voted {event.userVote === "UP" ? "👍" : "👎"}
                </p>
              )}
            </div>
          </div>

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
            <Button
              variant="secondary"
              className="px-3 sm:px-4"
              onClick={() => {
                const text = `Check out ${event.title} on @hashly_h 🗓️\n\nDiscover events on Hedera!`;
                const url = `https://hash-ly.com/events/${event.id}`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                  "_blank",
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
    </div>
  );
}
