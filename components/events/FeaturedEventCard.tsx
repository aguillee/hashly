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
  const score = event.score ?? (Math.max(0, event.votesUp) - Math.max(0, event.votesDown));
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
  const isUpcoming = !isLive && !isForeverMint;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block rounded-xl overflow-hidden bg-bg-card border border-border/50 hover:border-accent-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/5"
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-video bg-bg-secondary overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
            {isForeverMint ? (
              <Infinity className="h-10 w-10 text-purple-400/30" />
            ) : (
              <Calendar className="h-10 w-10 text-text-secondary/20" />
            )}
          </div>
        )}

        {/* Bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Status pill - top right */}
        <div className="absolute top-2.5 right-2.5">
          {isForeverMint ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              ALWAYS LIVE
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-primary/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wide">
              UPCOMING
            </span>
          )}
        </div>

        {/* Overlaid info on image bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 text-[10px] text-white/80">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(event.mintDate)}
            </span>
            {isUpcoming && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded-full">
                <Clock className="h-2.5 w-2.5" />
                {getTimeUntil(event.mintDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        {/* Title */}
        <h3 className="font-bold text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-snug">
          {event.title}
        </h3>

        {/* Footer: price + score + details */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-xs text-text-primary">
              {priceInfo.isHbar ? (
                <HbarIcon className="h-3.5 w-3.5" />
              ) : (
                <UsdcIcon className="h-3.5 w-3.5" />
              )}
              {priceInfo.value}
            </span>
            <span className={cn(
              "flex items-center gap-1 text-xs font-bold",
              score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-text-secondary"
            )}>
              <TrendingUp className="h-3 w-3" />
              {score > 0 ? `+${score}` : score}
            </span>
          </div>
          <span className="text-[11px] font-medium text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
            details <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
