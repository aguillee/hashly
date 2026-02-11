"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, TrendingUp, Infinity } from "lucide-react";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { formatDate, parseMintPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  status: "UPCOMING" | "LIVE";
  votesUp: number;
  votesDown: number;
  score?: number;
}

interface FeaturedEventCardProps {
  event: FeaturedEvent;
  variant: "mostVoted" | "nextUp" | "foreverMint";
}

export function FeaturedEventCard({ event, variant }: FeaturedEventCardProps) {
  const score = event.score ?? event.votesUp - event.votesDown;
  const priceInfo = parseMintPrice(event.mintPrice);

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return "Live Now";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "Starting soon";
  };

  const isLive = event.status === "LIVE" || new Date(event.mintDate) <= new Date();
  const isForeverMint = variant === "foreverMint";

  // Get border color based on variant/status
  const getBorderColor = () => {
    if (isForeverMint) return "border-l-purple-500 hover:border-l-purple-400";
    if (isLive) return "border-l-green-500 hover:border-l-green-400";
    return "border-l-accent-primary/50 hover:border-l-accent-primary";
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isForeverMint) {
      return (
        <span className="skew-tag inline-block px-2 py-0.5 bg-purple-600 text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
          <span>ALWAYS LIVE</span>
        </span>
      );
    }
    if (isLive) {
      return (
        <span className="skew-tag inline-block px-2 py-0.5 bg-green-600 text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
          <span>LIVE NOW</span>
        </span>
      );
    }
    return (
      <span className="skew-tag inline-block px-2 py-0.5 bg-accent-primary text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
        <span>UPCOMING</span>
      </span>
    );
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
            {isForeverMint ? (
              <Infinity className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400/50" />
            ) : (
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-text-secondary/30" />
            )}
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
          {getStatusBadge()}
        </div>

        {/* Countdown for upcoming (not forever mint) */}
        {!isLive && !isForeverMint && (
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{getTimeUntil(event.mintDate)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col border-t border-border/30">
        {/* Title */}
        <h3 className="font-bold text-text-primary mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-tight">
          {event.title}
        </h3>

        {/* Price, votes and details */}
        <div className="flex items-center justify-between text-xs text-text-secondary mt-auto pt-2 border-t border-dashed border-border/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              {priceInfo.isHbar ? (
                <HbarIcon className="h-3.5 w-3.5" />
              ) : (
                <UsdcIcon className="h-3.5 w-3.5" />
              )}
              {priceInfo.value}
            </span>
            <span className={cn(
              "flex items-center gap-1 font-bold",
              score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-text-secondary"
            )}>
              <TrendingUp className="h-3 w-3" />
              {score > 0 ? `+${score}` : score}
            </span>
          </div>
          <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
            details <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
