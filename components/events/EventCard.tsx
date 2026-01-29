"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, ThumbsUp, ThumbsDown, Clock, Box, ArrowUpRight, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { formatDate, formatTimeRemaining, getVoteScore, parseMintPrice } from "@/lib/utils";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    mintDate: string;
    mintPrice: string;
    supply: number | null;
    imageUrl: string | null;
    status: "UPCOMING" | "LIVE" | "ENDED";
    isForeverMint?: boolean;
    votesUp: number;
    votesDown: number;
    canVote?: boolean;
    voteLockedUntil?: string | null;
  };
  userVote?: "UP" | "DOWN" | null;
  onVote?: (eventId: string, voteType: "UP" | "DOWN") => void;
}

export function EventCard({ event, userVote, onVote }: EventCardProps) {
  const { isConnected } = useWalletStore();
  const [isVoting, setIsVoting] = React.useState(false);

  const score = getVoteScore(event.votesUp, event.votesDown);
  const timeRemaining = formatTimeRemaining(event.mintDate);
  const priceInfo = parseMintPrice(event.mintPrice);

  // Determine actual status based on time
  // Forever Mints are ALWAYS live, regardless of date
  const now = new Date();
  const mintDate = new Date(event.mintDate);

  let isEnded = false;
  let isLive = false;
  let isUpcoming = false;

  if (event.isForeverMint) {
    // Forever Mints are always LIVE
    isLive = true;
  } else {
    isEnded = mintDate < now && (now.getTime() - mintDate.getTime()) > 24 * 60 * 60 * 1000;
    isLive = !isEnded && mintDate <= now;
    isUpcoming = !isEnded && !isLive;
  }

  const actualStatus = isEnded ? "ENDED" : isLive ? "LIVE" : "UPCOMING";

  const canVoteNow = event.canVote !== false; // Default to true if not specified

  const handleVote = async (voteType: "UP" | "DOWN") => {
    if (!isConnected || !onVote || !canVoteNow) return;

    setIsVoting(true);
    try {
      await onVote(event.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="group relative">
      {/* Glow Effect */}
      <div className={cn(
        "absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
        isLive ? "bg-gradient-to-r from-success/30 to-emerald-400/30" : "bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20"
      )} />

      <Card className="relative overflow-hidden rounded-3xl border-border/50 bg-bg-card/80 backdrop-blur-sm">
        {/* Image */}
        <Link href={`/events/${event.id}`}>
          <div className="relative h-52 bg-gradient-to-br from-bg-secondary to-bg-card overflow-hidden">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary/20 via-accent-secondary/15 to-accent-primary/20">
                <div className="relative">
                  {/* Background decoration */}
                  <div className="absolute inset-0 -m-8">
                    <div className="absolute top-0 left-0 w-16 h-16 border border-accent-primary/20 rounded-2xl rotate-12" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border border-accent-secondary/20 rounded-xl -rotate-12" />
                  </div>
                  {/* Icon */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/30 to-accent-secondary/30 flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <Calendar className="h-10 w-10 text-accent-primary" />
                  </div>
                </div>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60" />

            {/* Status badge */}
            <div className="absolute top-4 left-4">
              {isLive ? (
                <Badge variant="live" size="lg" className="shadow-lg">
                  <span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                  Live Now
                </Badge>
              ) : isEnded ? (
                <Badge variant="ghost" size="lg">
                  Ended
                </Badge>
              ) : (
                <Badge variant="default" size="lg" className="shadow-lg">
                  Upcoming
                </Badge>
              )}
            </div>

            {/* Countdown */}
            {isUpcoming && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-accent-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-text-secondary font-medium">Starts in</div>
                      <div className="text-sm font-bold text-white">{timeRemaining}</div>
                    </div>
                  </div>
                  <Zap className="h-5 w-5 text-accent-primary animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title & Date */}
          <div>
            <Link href={`/events/${event.id}`}>
              <h3 className="font-bold text-lg line-clamp-1 text-text-primary group-hover:text-accent-primary transition-colors duration-300">
                {event.title}
              </h3>
            </Link>
            <p className="text-sm text-text-secondary mt-1">
              {formatDate(event.mintDate)}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Price & Supply */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
              {priceInfo.isHbar ? (
                <HbarIcon className="h-5 w-5" />
              ) : (
                <UsdcIcon className="h-5 w-5" />
              )}
              <span className="font-semibold text-sm text-accent-primary">
                {priceInfo.value}
              </span>
            </div>
            {event.supply && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary border border-border">
                <Box className="h-4 w-4 text-text-secondary" />
                <span className="font-medium text-sm text-text-primary">{event.supply.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Voting & Details */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote("UP")}
                disabled={!isConnected || isVoting || !canVoteNow}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  userVote === "UP"
                    ? "bg-success/20 text-success"
                    : "bg-bg-secondary text-text-secondary hover:text-success hover:bg-success/10",
                  (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                )}
                title={!canVoteNow ? "Vote locked - wait 24h" : undefined}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>

              <div className={cn(
                "min-w-[48px] text-center py-2 px-3 rounded-xl font-bold text-sm",
                score > 0 ? "bg-success/10 text-success" :
                score < 0 ? "bg-error/10 text-error" :
                "bg-bg-secondary text-text-secondary"
              )}>
                {score > 0 ? `+${score}` : score}
              </div>

              <button
                onClick={() => handleVote("DOWN")}
                disabled={!isConnected || isVoting || !canVoteNow}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  userVote === "DOWN"
                    ? "bg-error/20 text-error"
                    : "bg-bg-secondary text-text-secondary hover:text-error hover:bg-error/10",
                  (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                )}
                title={!canVoteNow ? "Vote locked - wait 24h" : undefined}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>

            <Link href={`/events/${event.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 group/btn">
                View Details
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
