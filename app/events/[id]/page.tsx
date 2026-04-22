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
  const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
  const isHackathon = event.event_type === "HACKATHON";
  const isStarsOnly = isMeetup || isHackathon; // Stars-only voting for meetups and hackathons
  const hasBadgeToken = badgeStatusData?.badge?.tokenId;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Navigation — ghost style, Arc flavor */}
      <div className="flex items-center justify-between mb-5 sm:mb-7">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[9px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Calendar
        </Link>

        {/* Prev / Next — segmented nav */}
        <div className="inline-flex p-0.5 rounded-[10px] border border-[var(--card-border)] bg-bg-card">
          {event.prevEvent ? (
            <Link
              href={`/events/${event.prevEvent.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70 transition-colors active:scale-[0.97]"
              title={event.prevEvent.title}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[13px] font-medium text-text-tertiary/50 cursor-not-allowed select-none">
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </span>
          )}
          <div className="w-px bg-[var(--border-subtle)] my-1" />
          {event.nextEvent ? (
            <Link
              href={`/events/${event.nextEvent.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70 transition-colors active:scale-[0.97]"
              title={event.nextEvent.title}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[13px] font-medium text-text-tertiary/50 cursor-not-allowed select-none">
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Header Card — 12px radius, hairline border */}
          <div className="bg-bg-card border border-[var(--card-border)] rounded-[12px] overflow-hidden">
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
                    <span className="inline-flex items-center gap-1.5 px-2 h-[24px] text-[11px] font-semibold rounded-[6px] bg-accent-coral/95 text-white shadow-[0_2px_8px_rgba(185,133,250,0.3)]">
                      <Infinity className="h-3 w-3" />
                      Always Live
                    </span>
                  ) : event.mintDate ? (
                    <span className="inline-flex items-center px-2 h-[24px] text-[11px] font-semibold rounded-[6px] bg-black/45 backdrop-blur-md border border-white/15 text-white tracking-tight">
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
            <div className={`p-5 sm:p-7 ${event.imageUrl ? "" : "pt-5 sm:pt-7"}`}>
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] leading-[1.15]">{event.title}</h1>
                  {hasBadgeToken && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[6px] bg-accent-coral/12 border border-accent-coral/30 text-accent-coral text-[11px] font-semibold">
                        <Award className="h-3 w-3" />
                        Attendance Badge NFT
                      </span>
                    </div>
                  )}
                </div>
                {!event.imageUrl && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.isForeverMint ? (
                      <span className="inline-flex items-center gap-1.5 px-2 h-[24px] text-[11px] font-semibold rounded-[6px] bg-accent-coral/95 text-white">
                        <Infinity className="h-3 w-3" />
                        Always Live
                      </span>
                    ) : event.mintDate ? (
                      <span className="inline-flex items-center px-2 h-[24px] text-[11px] font-semibold bg-bg-secondary text-text-primary rounded-[6px]">
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
              <div className="flex flex-wrap gap-2 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[var(--border-subtle)]">
                {event.websiteUrl && (
                  <a
                    href={event.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] hover:border-brand/40 hover:text-brand transition-[color,border-color] duration-200 text-[13px] font-medium active:scale-[0.97]"
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
                    className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] hover:border-brand/40 hover:text-brand transition-[color,border-color] duration-200 text-[13px] font-medium active:scale-[0.97]"
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
                    className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] hover:border-brand/40 hover:text-brand transition-[color,border-color] duration-200 text-[13px] font-medium active:scale-[0.97]"
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
                    className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] hover:border-brand/40 hover:text-brand transition-[color,border-color] duration-200 text-[13px] font-medium active:scale-[0.97]"
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
            <div className="bg-bg-card border border-[var(--card-border)] rounded-[14px] overflow-hidden">
              <div className="px-5 sm:px-6 h-14 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[8px] bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5 text-accent-coral" />
                  </div>
                  <h3 className="font-semibold text-[14px] text-text-primary tracking-tight">Mint Phases</h3>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium tabular-nums">
                  {event.phases.length} phase{event.phases.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-3">
                {event.phases
                  .sort((a, b) => a.order - b.order)
                  .map((phase, index) => {
                    const status = getPhaseStatus(phase);
                    return (
                      <div
                        key={phase.id}
                        className={cn(
                          "p-4 rounded-[12px] border transition-colors",
                          status === "active"
                            ? "bg-success/[0.06] border-success/30 shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]"
                            : status === "ended"
                            ? "bg-bg-secondary/40 border-[var(--border-subtle)] opacity-55"
                            : "bg-bg-secondary/40 border-[var(--border-subtle)]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-semibold text-[14px] text-text-primary tracking-tight">{phase.name}</span>
                            {phase.isWhitelist && (
                              <span className="inline-flex items-center px-1.5 h-[18px] text-[10px] font-semibold bg-accent-coral/12 text-accent-coral border border-accent-coral/25 rounded-[4px]">WL</span>
                            )}
                            {status === "active" && (
                              <span className="inline-flex items-center gap-1 px-2 h-[20px] bg-success/12 text-success border border-success/25 rounded-[5px] text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                ACTIVE
                              </span>
                            )}
                            {status === "ended" && (
                              <span className="inline-flex items-center px-2 h-[20px] bg-bg-secondary text-text-tertiary border border-[var(--border-subtle)] rounded-[5px] text-[10px] font-semibold uppercase tracking-wider">
                                Ended
                              </span>
                            )}
                          </div>
                          {(() => {
                            const phasePriceInfo = parseMintPrice(phase.price);
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 h-[28px] rounded-[8px] bg-brand/8 border border-brand/20 text-brand text-[14px] font-semibold tabular-nums">
                                {phasePriceInfo.isHbar ? (
                                  <HbarIcon className="h-3.5 w-3.5" />
                                ) : (
                                  <UsdcIcon className="h-3.5 w-3.5" />
                                )}
                                {phasePriceInfo.value}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-0.5">Starts</p>
                            <p className="font-medium text-[13px] text-text-primary tabular-nums">{formatShortDate(phase.startDate)}</p>
                          </div>
                          {phase.endDate && (
                            <div>
                              <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-0.5">Ends</p>
                              <p className="font-medium text-[13px] text-text-primary tabular-nums">{formatShortDate(phase.endDate)}</p>
                            </div>
                          )}
                          {phase.supply && (
                            <div>
                              <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-0.5">Supply</p>
                              <p className="font-medium text-[13px] text-text-primary tabular-nums">{phase.supply.toLocaleString()}</p>
                            </div>
                          )}
                          {phase.maxPerWallet && (
                            <div>
                              <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium mb-0.5">Max/Wallet</p>
                              <p className="font-medium text-[13px] text-text-primary tabular-nums">{phase.maxPerWallet}</p>
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
          {/* Event Info */}
          <div className="bg-bg-card border border-[var(--card-border)] rounded-[12px] overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
              {event.isForeverMint ? (
                /* Forever Mint: Always Live */
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-accent-coral/10 border border-accent-coral/20">
                    <Infinity className="h-4 w-4 sm:h-5 sm:w-5 text-accent-coral" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-secondary">Availability</p>
                    <p className="font-bold text-base sm:text-lg text-purple-400">
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

          {/* Voting */}
          <div className="bg-bg-card border border-[var(--card-border)] rounded-[14px] overflow-hidden">
            <div className="px-5 sm:px-6 h-14 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[8px] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Star className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-[14px] text-text-primary tracking-tight">
                {isStarsOnly ? "Community Rating" : "Community Score"}
              </h3>
            </div>

            <div className="p-5 sm:p-6">
              <div className="text-center mb-5">
                {isStarsOnly ? (
                  <div className="inline-flex items-center justify-center gap-2 px-4 h-14 rounded-[14px] bg-amber-400/8 border border-amber-400/25">
                    <Star className="h-7 w-7 text-amber-400 fill-amber-400" />
                    <span className="text-[36px] font-semibold text-amber-400 tabular-nums tracking-tight leading-none">
                      {event.votesUp}
                    </span>
                  </div>
                ) : (
                  <div className={cn(
                    "inline-flex items-center justify-center px-5 h-14 rounded-[14px] border tabular-nums",
                    score > 0
                      ? "bg-success/8 border-success/25 text-success"
                      : score < 0
                      ? "bg-error/8 border-error/25 text-error"
                      : "bg-bg-secondary border-[var(--card-border)] text-text-secondary"
                  )}>
                    <span className="text-[36px] font-semibold tracking-tight leading-none">
                      {score > 0 ? "+" : ""}{score}
                    </span>
                  </div>
                )}
              </div>

              {/* Connect wallet message */}
              {!isConnected && (
                <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-brand/8 border border-brand/20 text-center">
                  <p className="text-[12px] text-brand font-medium">
                    Connect wallet to {isStarsOnly ? "rate" : "vote"}
                  </p>
                </div>
              )}

              {/* Vote locked message */}
              {isConnected && event.userVote && !event.canVote && voteCountdown && (
                <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-warning/8 border border-warning/25 text-center">
                  <p className="text-[12px] text-warning font-medium">
                    {isStarsOnly ? "Rate" : "Vote"} again in <span className="tabular-nums">{voteCountdown}</span>
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
                      "w-full gap-2",
                      event.userVote === "UP" && !event.canVote && "!bg-amber-400 hover:!bg-amber-400 !text-[#2a1a00] !shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_20px_-8px_rgba(251,191,36,0.55)]",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Star className={cn("h-4 w-4", event.userVote === "UP" && !event.canVote && "fill-current")} />
                    {event.userVote === "UP" && !event.canVote ? "Starred" : "Give a Star"}
                  </Button>
                  {event.userVote === "UP" && (
                    <p className="text-center text-[12px] text-text-secondary mt-2.5">
                      {event.canVote ? "You can star again" : "You starred this event ⭐"}
                    </p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={event.userVote === "UP" && !event.canVote ? "success" : "secondary"}
                    onClick={() => handleVote("UP")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsUp className={cn("h-4 w-4", event.userVote === "UP" && !event.canVote && "fill-current")} />
                    <span className="tabular-nums">{Math.max(0, event.votesUp)}</span>
                  </Button>
                  <Button
                    variant={event.userVote === "DOWN" && !event.canVote ? "destructive" : "secondary"}
                    onClick={() => handleVote("DOWN")}
                    disabled={voting || !isConnected || !event.canVote}
                    className={cn(
                      "gap-2",
                      (!isConnected || !event.canVote) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ThumbsDown className={cn("h-4 w-4", event.userVote === "DOWN" && !event.canVote && "fill-current")} />
                    <span className="tabular-nums">{Math.max(0, event.votesDown)}</span>
                  </Button>
                </div>
              )}

              {isConnected && event.userVote && !isStarsOnly && (
                <p className="text-[12px] text-text-secondary text-center mt-3">
                  {event.canVote ? "You can vote again" : `You voted ${event.userVote === "UP" ? "👍" : "👎"}`}
                </p>
              )}
            </div>
          </div>

          {/* Attendance Badge - only for meetups */}
          {isMeetup && (
            <div className="bg-bg-card border border-[var(--card-border)] rounded-[14px] overflow-hidden">
              <div className="px-5 sm:px-6 h-14 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center">
                  <Award className="h-3.5 w-3.5 text-accent-coral" />
                </div>
                <h3 className="font-semibold text-[14px] text-text-primary tracking-tight">Attendance Badge</h3>
              </div>

              <div className="p-5 sm:p-6">
                {badgeStatusData?.badge ? (
                  <div className="space-y-3">
                    {badgeStatusData.badge.status === "DISTRIBUTED" ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-success/8 border border-success/25">
                        <Check className="h-4 w-4 text-success" />
                        <span className="text-[13px] text-success font-medium">
                          Badge distributed (<span className="tabular-nums">{badgeStatusData.badge.supply}</span> claimed)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-accent-coral/8 border border-accent-coral/25">
                        <Mic2 className="h-4 w-4 text-accent-coral" />
                        <span className="text-[13px] text-accent-coral font-medium">
                          Badge in progress
                        </span>
                      </div>
                    )}
                    {badgeStatusData.badge.tokenId && (
                      <p className="text-[11px] text-text-tertiary">
                        Token ID: <span className="tabular-nums text-text-secondary">{badgeStatusData.badge.tokenId}</span>
                      </p>
                    )}
                  </div>
                ) : badgeStatusData?.hostRequest ? (
                  <div className="space-y-2">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-[10px] border",
                      badgeStatusData.hostRequest.status === "PENDING"
                        ? "bg-warning/8 border-warning/25"
                        : badgeStatusData.hostRequest.status === "APPROVED"
                          ? "bg-success/8 border-success/25"
                          : "bg-error/8 border-error/25"
                    )}>
                      <span className={cn(
                        "text-[13px] font-medium",
                        badgeStatusData.hostRequest.status === "PENDING"
                          ? "text-warning"
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
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-[10px] bg-brand/8 border border-brand/25 text-brand hover:bg-brand/12 hover:border-brand/40 transition-colors text-[13px] font-medium active:scale-[0.98]"
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
          <p className="text-[10px] text-text-tertiary text-center truncate px-2 tabular-nums">
            Submitted by <span className="text-text-secondary">{event.createdBy.walletAddress}</span>
          </p>
        </div>
      </div>

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

