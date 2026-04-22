"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, CalendarPlus, ThumbsUp, ThumbsDown, Clock, Box, Star, MapPin, Globe, Users, Award, Infinity } from "lucide-react";
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
    hasBadge?: boolean;
    source?: string;
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

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group block rounded-[12px] overflow-hidden bg-bg-card border",
        "transition-[border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--card-hover-shadow)]",
        event.hasBadge
          ? "border-amber-500/40 hover:border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.08)]"
          : "border-[var(--card-border)] hover:border-[var(--card-border-hover)]"
      )}
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-tertiary">
            <Calendar className="h-10 w-10 text-tertiary" />
          </div>
        )}

        {/* Bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badge indicator - top left */}
        {event.hasBadge && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 h-[22px] bg-amber-500/95 rounded-[6px] text-[10px] font-semibold text-[#2a1a00] tracking-[0.02em] shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
              <Award className="h-3 w-3" />
              NFT BADGE
            </span>
          </div>
        )}

        {/* Status pill - top right */}
        <div className="absolute top-2.5 right-2.5">
          {event.isForeverMint ? (
            <span className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-[6px] text-[10px] font-semibold text-white tracking-[0.02em] bg-accent-coral/95 shadow-[0_2px_8px_rgba(185,133,250,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              ALWAYS LIVE
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2 h-[22px] bg-success/95 rounded-[6px] text-[10px] font-semibold text-[#05241a] tracking-[0.02em] shadow-[0_2px_8px_rgba(52,211,153,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#05241a] animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 h-[22px] bg-black/40 backdrop-blur-sm border border-white/15 rounded-[6px] text-[10px] font-semibold text-white tracking-[0.02em]">
              UPCOMING
            </span>
          )}
        </div>

        {/* Overlaid info on image bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 text-[10px] text-white/80">
            {event.isForeverMint ? (
              <span className="flex items-center gap-1">
                <Infinity className="h-3 w-3" />
                Always Live
              </span>
            ) : (
              <>
                {event.mintDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.mintDate)}
                  </span>
                )}
                {isUpcoming && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded-full font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    {timeRemaining}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        {/* Host for meetups/hackathons */}
        {isStarsOnly && event.host && (
          <div className="flex items-center gap-1.5 text-[10px] text-tertiary">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isMeetup ? "bg-brand" : "bg-violet-500"
            )} />
            <span className="truncate">{event.host}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-primary line-clamp-2 transition-colors duration-150 text-sm sm:text-base leading-snug">
          {event.title}
        </h3>

        {/* Meta row: price/location + supply */}
        <div className="flex items-center gap-2.5 text-xs text-secondary">
          {isStarsOnly ? (
            <>
              {event.location_type === "IN_PERSON" && event.location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{event.location}</span>
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
              <span className="flex items-center gap-1 font-semibold text-primary font-mono">
                {priceInfo.isHbar ? (
                  <HbarIcon className="h-3.5 w-3.5" />
                ) : (
                  <UsdcIcon className="h-3.5 w-3.5" />
                )}
                {priceInfo.value}
              </span>
              {event.supply && (
                <span className="flex items-center gap-1 text-secondary font-mono">
                  <Box className="h-3 w-3" />
                  {event.supply.toLocaleString()}
                </span>
              )}
            </>
          )}
        </div>

        {/* Footer: voting + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
            {isStarsOnly ? (
              <>
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded-md transition-colors duration-150",
                    userVote === "UP"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "text-secondary hover:text-yellow-500 hover:bg-yellow-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", userVote === "UP" && "fill-yellow-500")} />
                </button>
                <span className="text-xs font-bold text-yellow-500 min-w-[24px] text-center font-mono">{score}</span>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleVote("UP")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded-md transition-colors duration-150",
                    userVote === "UP"
                      ? "bg-green-500/20 text-green-500"
                      : "text-secondary hover:text-green-500 hover:bg-green-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <span className={cn(
                  "text-xs font-bold min-w-[32px] text-center font-mono",
                  score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-secondary"
                )}>
                  {score > 0 ? `+${score}` : score}
                </span>
                <button
                  onClick={() => handleVote("DOWN")}
                  disabled={!isConnected || isVoting || !canVoteNow}
                  className={cn(
                    "p-1.5 rounded-md transition-colors duration-150",
                    userVote === "DOWN"
                      ? "bg-red-500/20 text-red-500"
                      : "text-secondary hover:text-red-500 hover:bg-red-500/10",
                    (!isConnected || isVoting || !canVoteNow) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <ShareToXButton
              shareText={`Check out ${event.title} on @hashly_h`}
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
                className="p-1.5 ml-0.5 text-secondary hover:text-primary transition-colors duration-150"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <span className="text-[11px] font-medium text-secondary transition-colors duration-150 flex items-center gap-1">
            details →
          </span>
        </div>
      </div>
    </Link>
  );
}
