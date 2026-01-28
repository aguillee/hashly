"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, Trophy, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { formatDate, parseMintPrice } from "@/lib/utils";

interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  category: string;
  status: "UPCOMING" | "LIVE" | "ENDED";
  votesUp: number;
  votesDown: number;
  score?: number;
}

interface FeaturedEventCardProps {
  event: FeaturedEvent;
  variant: "mostVoted" | "nextUp";
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

  if (variant === "mostVoted") {
    // Hero card with background image
    return (
      <Link href={`/events/${event.id}`} className="block group">
        <div
          className="relative h-80 sm:h-96 rounded-3xl overflow-hidden"
          style={{
            backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Fallback gradient if no image */}
          {!event.imageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20" />
          )}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

          {/* Content */}
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
            {/* Top badges */}
            <div className="flex items-center justify-between">
              <Badge className="bg-yellow-500/90 text-black font-semibold gap-1">
                <Trophy className="h-3.5 w-3.5" />
                Most Voted
              </Badge>
              <Badge
                variant={event.status === "LIVE" ? "success" : "default"}
                className={event.status === "LIVE" ? "animate-pulse" : ""}
              >
                {event.status === "LIVE" ? "Live Now" : "Upcoming"}
              </Badge>
            </div>

            {/* Bottom content */}
            <div>
              <p className="text-sm text-white/70 mb-1 capitalize">{event.category}</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 group-hover:text-accent-primary transition-colors">
                {event.title}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.mintDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {priceInfo.isHbar ? (
                    <HbarIcon className="h-4 w-4" />
                  ) : (
                    <UsdcIcon className="h-4 w-4" />
                  )}
                  <span>{priceInfo.value} {priceInfo.isHbar ? "HBAR" : "USDC"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400 font-semibold">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{score} votes</span>
                </div>
              </div>

              <Button className="gap-2 group/btn">
                View Details
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Next Up - Smaller card
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="flex gap-4 p-4 rounded-2xl bg-bg-card border border-border hover:border-accent-primary/50 transition-all">
        {/* Image */}
        <div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-bg-secondary"
          style={{
            backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!event.imageUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-text-secondary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
              <Clock className="h-3 w-3" />
              Minting Soon
            </Badge>
          </div>

          <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate mb-1">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <span className="font-medium text-accent-primary">
              {getTimeUntil(event.mintDate)}
            </span>
            <span className="flex items-center gap-1">
              {priceInfo.isHbar ? (
                <HbarIcon className="h-3.5 w-3.5" />
              ) : (
                <UsdcIcon className="h-3.5 w-3.5" />
              )}
              {priceInfo.value}
            </span>
            <span className="text-success">+{score}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
