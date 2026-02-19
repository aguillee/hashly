"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, CalendarPlus, ThumbsUp, ThumbsDown, Clock, Box, Star, MapPin, Globe, Users } from "lucide-react";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { formatDate, formatTimeRemaining, getVoteScore, parseMintPrice } from "@/lib/utils";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { ShareToXButton } from "@/components/ui/ShareToXButton";
import { getGoogleCalendarUrl } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    mintDate: string;
    endDate?: string | null;
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

  const now = new Date();
  const mintDate = new Date(event.mintDate);

  let isLive = false;
  let isUpcoming = false;

  if (event.isForeverMint) {
    isLive = true;
  } else {
    isLive = mintDate <= now;
    isUpcoming = !isLive;
  }

  const canVoteNow = event.canVote !== false;

  const handleVote = async (voteType: "UP" | "DOWN") => {
    if (!isConnected || !onVote || !canVoteNow) return;

    setIsVoting(true);
    try {
      await onVote(event.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  // Get border color based on status
  const getBorderColor = () => {
    if (event.isForeverMint) return "border-l-purple-500 hover:border-l-purple-400";
    if (isLive) return "border-l-green-500 hover:border-l-green-400";
    return "border-l-accent-primary/50 hover:border-l-accent-primary";
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex flex-col bg-bg-card/80 overflow-hidden transition-all duration-200",
        "border-l-4 rounded-r-md",
        getBorderColor()
      )}
    >
      {/* Image */}
      <div className="relative aspect-video bg-bg-secondary overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-text-secondary/30" />
          </div>
        )}

        {/* Date badge - same style as countdown */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
            <Calendar className="h-3 w-3" />
            <span className="font-mono">{formatDate(event.mintDate)}</span>
          </div>
        </div>

        {/* Status Badge - skewed tag style */}
        <div className="absolute top-2 right-2">
          {event.isForeverMint ? (
            <span className="skew-tag inline-block px-2 py-0.5 bg-purple-600 text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
              <span>ALWAYS LIVE</span>
            </span>
          ) : isLive ? (
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
        {isUpcoming && (
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{timeRemaining}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col border-t border-border/30">
        {/* Host/Creator for meetups */}
        {isStarsOnly && event.host && (
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary/70 mb-1.5">
            <span className="w-1 h-1 rounded-full bg-accent-primary" />
            <span className="truncate">{event.host}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-text-primary mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-tight">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-text-secondary/80 line-clamp-2 flex-1">
          {event.description}
        </p>

        {/* Price/Location info */}
        <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
          {isStarsOnly ? (
            <>
              {event.location_type === "IN_PERSON" && event.location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{event.location}</span>
                </span>
              ) : event.location_type === "ONLINE" ? (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Online
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 font-medium">
                {priceInfo.isHbar ? (
                  <HbarIcon className="h-3.5 w-3.5" />
                ) : (
                  <UsdcIcon className="h-3.5 w-3.5" />
                )}
                {priceInfo.value}
              </span>
              {event.supply && (
                <span className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  {event.supply.toLocaleString()}
                </span>
              )}
            </>
          )}
        </div>

        {/* Footer with voting */}
        <div className="mt-3 pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
          {/* Voting */}
          <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
            {isStarsOnly ? (
              <>
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    userVote === "UP"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "text-text-secondary hover:text-yellow-500 hover:bg-yellow-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", userVote === "UP" && "fill-yellow-500")} />
                </button>
                <span className="text-xs font-bold text-yellow-500 min-w-[24px] text-center">{score}</span>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    userVote === "UP"
                      ? "bg-green-500/20 text-green-500"
                      : "text-text-secondary hover:text-green-500 hover:bg-green-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <span className={cn(
                  "text-xs font-bold min-w-[32px] text-center",
                  score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-text-secondary"
                )}>
                  {score > 0 ? `+${score}` : score}
                </span>
                <button
                  onClick={() => handleVote("DOWN")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    userVote === "DOWN"
                      ? "bg-red-500/20 text-red-500"
                      : "text-text-secondary hover:text-red-500 hover:bg-red-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <ShareToXButton
              shareText={`Check out ${event.title} on @hashly_h 🗓️`}
              shareUrl={`https://hash-ly.com/events/${event.id}`}
              className="p-1.5 ml-1"
            />
            {isUpcoming && (
              <button
                onClick={() => {
                  window.open(
                    getGoogleCalendarUrl({
                      title: event.title,
                      mintDate: event.mintDate,
                      endDate: event.endDate,
                      location: event.location,
                      id: event.id,
                    }),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                title="Add to Google Calendar"
                className="p-1.5 ml-0.5 text-text-secondary hover:text-accent-primary transition-colors"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View more */}
          <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
            details <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
