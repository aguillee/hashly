"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, ThumbsUp, ThumbsDown, Clock, Box, ArrowUpRight, Zap, Star, MapPin, Globe, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { formatDate, formatTimeRemaining, getVoteScore, parseMintPrice } from "@/lib/utils";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { ShareToXButton } from "@/components/ui/ShareToXButton";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    mintDate: string;
    mintPrice: string;
    supply: number | null;
    imageUrl: string | null;
    status: "UPCOMING" | "LIVE";
    isForeverMint?: boolean;
    votesUp: number;
    votesDown: number;
    canVote?: boolean;
    voteLockedUntil?: string | null;
    event_type?: "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";
    host?: string | null;
    location?: string | null;
    location_type?: string | null;
  };
  userVote?: "UP" | "DOWN" | null;
  onVote?: (eventId: string, voteType: "UP" | "DOWN") => void;
}

export function EventCard({ event, userVote, onVote }: EventCardProps) {
  const { isConnected } = useWalletStore();
  const [isVoting, setIsVoting] = React.useState(false);

  const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
  const isHackathon = event.event_type === "HACKATHON";
  const isStarsOnly = isMeetup || isHackathon;
  const score = isStarsOnly ? event.votesUp : getVoteScore(event.votesUp, event.votesDown);
  const timeRemaining = formatTimeRemaining(event.mintDate);
  const priceInfo = parseMintPrice(event.mintPrice);

  // Determine actual status based on time
  // Forever Mints are ALWAYS live, regardless of date
  const now = new Date();
  const mintDate = new Date(event.mintDate);

  let isLive = false;
  let isUpcoming = false;

  if (event.isForeverMint) {
    // Forever Mints are always LIVE
    isLive = true;
  } else {
    isLive = mintDate <= now;
    isUpcoming = !isLive;
  }

  const actualStatus = isLive ? "LIVE" : "UPCOMING";

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

      <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-border/50 bg-bg-card/80 backdrop-blur-sm">
        {/* Image */}
        <Link href={`/events/${event.id}`}>
          <div className="relative h-44 sm:h-52 bg-gradient-to-br from-bg-secondary to-bg-card overflow-hidden">
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
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
              {isLive ? (
                <Badge variant="live" size="default" className="shadow-lg text-xs sm:text-sm">
                  <span className="mr-1 sm:mr-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse" />
                  Live Now
                </Badge>
              ) : (
                <Badge variant="default" size="default" className="shadow-lg text-xs sm:text-sm">
                  Upcoming
                </Badge>
              )}
            </div>

            {/* Countdown */}
            {isUpcoming && (
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                <div className="bg-black/60 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-accent-primary/20 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] uppercase text-text-secondary font-medium">Starts in</div>
                      <div className="text-xs sm:text-sm font-bold text-white">{timeRemaining}</div>
                    </div>
                  </div>
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-accent-primary animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Title & Date */}
          <div>
            <Link href={`/events/${event.id}`}>
              <h3 className="font-bold text-base sm:text-lg line-clamp-1 text-text-primary group-hover:text-accent-primary transition-colors duration-300">
                {event.title}
              </h3>
            </Link>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
              {formatDate(event.mintDate)}
            </p>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Price & Supply (mint) or Host & Location (meetup/hackathon) */}
          {isStarsOnly ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {event.host && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-accent-primary/10 border border-accent-primary/20">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                  <span className="font-medium text-xs sm:text-sm text-accent-primary truncate max-w-[100px] sm:max-w-none">{event.host}</span>
                </div>
              )}
              {event.location_type === "IN_PERSON" && event.location ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-bg-secondary border border-border">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-secondary flex-shrink-0" />
                  <span className="font-medium text-xs sm:text-sm text-text-primary truncate max-w-[100px] sm:max-w-none">{event.location}</span>
                </div>
              ) : event.location_type === "ONLINE" ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-bg-secondary border border-border">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-secondary" />
                  <span className="font-medium text-xs sm:text-sm text-text-primary">Online</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-accent-primary/10 border border-accent-primary/20">
                {priceInfo.isHbar ? (
                  <HbarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <UsdcIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span className="font-semibold text-xs sm:text-sm text-accent-primary">
                  {priceInfo.value}
                </span>
              </div>
              {event.supply && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-bg-secondary border border-border">
                  <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-secondary" />
                  <span className="font-medium text-xs sm:text-sm text-text-primary">{event.supply.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Voting & Details */}
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border gap-2">
            {isStarsOnly ? (
              /* Star voting for meetups/hackathons - only positive */
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300",
                    userVote === "UP"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-bg-secondary text-text-secondary hover:text-yellow-400 hover:bg-yellow-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                  title={!canVoteNow ? "Vote locked - wait 24h" : undefined}
                >
                  <Star className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", userVote === "UP" && "fill-yellow-400")} />
                </button>
                <div className="min-w-[40px] sm:min-w-[48px] text-center py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm bg-yellow-500/10 text-yellow-400">
                  {score}
                </div>
              </div>
            ) : (
              /* Standard thumbs voting for mint events */
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300",
                    userVote === "UP"
                      ? "bg-success/20 text-success"
                      : "bg-bg-secondary text-text-secondary hover:text-success hover:bg-success/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                  title={!canVoteNow ? "Vote locked - wait 24h" : undefined}
                >
                  <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                <div className={cn(
                  "min-w-[40px] sm:min-w-[48px] text-center py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm",
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
                    "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300",
                    userVote === "DOWN"
                      ? "bg-error/20 text-error"
                      : "bg-bg-secondary text-text-secondary hover:text-error hover:bg-error/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                  title={!canVoteNow ? "Vote locked - wait 24h" : undefined}
                >
                  <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1">
              <ShareToXButton
                shareText={`Check out ${event.title} on @hashly_h 🗓️\n\nDiscover events on Hedera!`}
                shareUrl={`https://hash-ly.com/events/${event.id}`}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl"
              />
              <Link href={`/events/${event.id}`}>
                <Button variant="ghost" size="sm" className="gap-1 sm:gap-1.5 group/btn text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">View</span>
                  <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
