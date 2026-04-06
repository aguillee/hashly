"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, Star, Zap } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useSpotlight } from "@/hooks/useSpotlight";

interface FeaturedCardProps {
  event: {
    id: string;
    title: string;
    imageUrl?: string | null;
    mintDate?: string | null;
    status?: string;
    votesUp?: number;
    votesDown?: number;
    host?: string;
    prizes?: string;
    location?: string;
    location_type?: string;
  };
  label?: string;
  labelIcon?: React.ElementType;
  className?: string;
  /** Aspect ratio class — defaults to aspect-[16/9] */
  aspect?: string;
  /** External link instead of internal */
  href?: string;
  external?: boolean;
}

export function FeaturedCard({
  event,
  label,
  labelIcon: LabelIcon,
  className,
  aspect = "aspect-[16/9]",
  href,
  external,
}: FeaturedCardProps) {
  const spotlight = useSpotlight();
  const isLive = event.status === "LIVE";

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "Soon";
  };

  const timeUntil = event.mintDate && !isLive ? getTimeUntil(event.mintDate) : null;
  const linkHref = href || `/events/${event.id}`;

  const card = (
    <div
      ref={spotlight.ref}
      onMouseMove={spotlight.onMouseMove}
      className={cn(
        "relative overflow-hidden rounded-xl bg-bg-card border border-[var(--card-border)] transition-all duration-200",
        "hover:border-[var(--card-border-hover)] hover:shadow-card-hover",
        "card-spotlight group",
        isLive && "shimmer-border",
        className
      )}
    >
      {/* Image */}
      <div className={cn("relative w-full overflow-hidden bg-bg-secondary", aspect)}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Status pill — top right */}
        <div className="absolute top-3 right-3 z-10">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-[11px] font-bold text-white tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : label ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-full text-[11px] font-medium text-white/90 tracking-wide">
              {LabelIcon && <LabelIcon className="h-3 w-3" />}
              {label}
            </span>
          ) : null}
        </div>

        {/* Content overlaid on image bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          {event.host && (
            <p className="text-[11px] text-white/60 mb-1 font-medium">{event.host}</p>
          )}
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight line-clamp-2 mb-2">
            {event.title}
          </h3>

          <div className="flex items-center gap-3 flex-wrap">
            {event.mintDate && (
              <span className="flex items-center gap-1 text-[11px] text-white/70">
                <Calendar className="h-3 w-3" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {timeUntil && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-[11px] text-white/80 font-mono">
                <Clock className="h-2.5 w-2.5" />
                {timeUntil}
              </span>
            )}
            {event.votesUp !== undefined && (event.votesUp - (event.votesDown || 0)) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-yellow-400 font-bold font-mono">
                <Star className="h-3 w-3 fill-yellow-400" />
                {event.votesUp - (event.votesDown || 0)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (external && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {card}
      </a>
    );
  }

  return (
    <Link href={linkHref} className="block">
      {card}
    </Link>
  );
}

/** Skeleton for FeaturedCard */
export function FeaturedCardSkeleton({ aspect = "aspect-[16/9]" }: { aspect?: string }) {
  return (
    <div className={cn("rounded-xl overflow-hidden bg-bg-card border border-[var(--card-border)]")}>
      <div className={cn("skeleton w-full", aspect)} />
    </div>
  );
}
