"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  Twitter,
  Globe,
  Users,
  ThumbsUp,
  ThumbsDown,
  Share2,
  ArrowLeft,
  Loader2,
  Layers,
  AlertCircle,
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

interface EventDetail {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  status: "UPCOMING" | "LIVE" | "ENDED";
  votesUp: number;
  votesDown: number;
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
    const text = `Check out ${event?.title} on Hedera Mint Calendar!`;

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        return <Badge variant="success" className="animate-pulse">Live Now</Badge>;
      case "ENDED":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="default">Upcoming</Badge>;
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calendar
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            {event.imageUrl && (
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  {getStatusBadge(event.status)}
                </div>
              </div>
            )}
            <CardContent className={event.imageUrl ? "pt-6" : "pt-6"}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{event.title}</h1>
                </div>
                {!event.imageUrl && getStatusBadge(event.status)}
              </div>

              <div
                className="text-text-secondary prose prose-sm prose-invert max-w-none [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_strong]:text-text-primary [&_a]:text-accent-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />

              {/* Links */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                {event.websiteUrl && (
                  <a
                    href={event.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-border transition-colors text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {event.twitterUrl && (
                  <a
                    href={event.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-border transition-colors text-sm"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {event.discordUrl && (
                  <a
                    href={event.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-border transition-colors text-sm"
                  >
                    <Users className="h-4 w-4" />
                    Discord
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mint Phases */}
          {event.phases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-accent-primary" />
                  Mint Phases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                            ? "bg-success/5 border-success/30"
                            : status === "ended"
                            ? "bg-bg-secondary border-border opacity-60"
                            : "bg-bg-card border-border"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{phase.name}</span>
                            {phase.isWhitelist && (
                              <Badge variant="secondary" className="text-xs">WL</Badge>
                            )}
                            {status === "active" && (
                              <Badge variant="success" className="text-xs animate-pulse">Active</Badge>
                            )}
                          </div>
                          {(() => {
                            const phasePriceInfo = parseMintPrice(phase.price);
                            return (
                              <span className="text-lg font-bold text-accent-primary flex items-center gap-1">
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
                            <p className="text-text-secondary">Starts</p>
                            <p className="font-medium">{formatShortDate(phase.startDate)}</p>
                          </div>
                          {phase.endDate && (
                            <div>
                              <p className="text-text-secondary">Ends</p>
                              <p className="font-medium">{formatShortDate(phase.endDate)}</p>
                            </div>
                          )}
                          {phase.supply && (
                            <div>
                              <p className="text-text-secondary">Supply</p>
                              <p className="font-medium">{phase.supply.toLocaleString()}</p>
                            </div>
                          )}
                          {phase.maxPerWallet && (
                            <div>
                              <p className="text-text-secondary">Max/Wallet</p>
                              <p className="font-medium">{phase.maxPerWallet}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Mint Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent-primary/10">
                  <Calendar className="h-5 w-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Mint Date</p>
                  <p className="font-medium">{formatDate(event.mintDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Time Until Mint</p>
                  <p className="font-medium text-lg">{getTimeUntil(event.mintDate)}</p>
                </div>
              </div>

              {(() => {
                const priceInfo = parseMintPrice(event.mintPrice);
                return (
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-yellow-500/10">
                      {priceInfo.isHbar ? (
                        <HbarIcon className="h-5 w-5" />
                      ) : (
                        <UsdcIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Mint Price</p>
                      <p className="font-medium text-lg">
                        {priceInfo.isHbar ? `${priceInfo.value} HBAR` : `$${priceInfo.value}`}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {event.supply && (
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Layers className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Total Supply</p>
                    <p className="font-medium text-lg">{event.supply.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voting */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Community Score</h3>
              <div className="text-center mb-4">
                <span className={cn(
                  "text-4xl font-bold",
                  score > 0 ? "text-success" : score < 0 ? "text-error" : "text-text-secondary"
                )}>
                  {score > 0 ? "+" : ""}{score}
                </span>
              </div>

              {/* Connect wallet message */}
              {!isConnected && (
                <div className="mb-4 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-center">
                  <p className="text-sm text-accent-primary font-medium">
                    Connect wallet to vote
                  </p>
                </div>
              )}

              {/* Vote locked message - only show if connected */}
              {isConnected && event.userVote && !event.canVote && voteCountdown && (
                <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
                  <p className="text-sm text-orange-500 font-medium">
                    Vote again in {voteCountdown}
                  </p>
                </div>
              )}

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

              {isConnected && event.userVote && (
                <p className="text-xs text-text-secondary text-center mt-3">
                  You voted {event.userVote === "UP" ? "👍" : "👎"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Share */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Event
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const text = `Check out ${event.title} on @hashly_h 🗓️\n\nThe mint calendar for Hedera!`;
                const url = `https://hash-ly.com/events/${event.id}`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                  "_blank",
                  "noopener,noreferrer,width=550,height=420"
                );
              }}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Submitted By */}
          <p className="text-xs text-text-secondary text-center">
            Submitted by {event.createdBy.walletAddress}
          </p>
        </div>
      </div>
    </div>
  );
}
