"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, Star } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface CompactCardProps {
  event: {
    id: string;
    title: string;
    imageUrl?: string | null;
    mintDate?: string | null;
    status?: string;
    votesUp?: number;
    host?: string;
  };
  className?: string;
  href?: string;
  external?: boolean;
}

export function CompactCard({ event, className, href, external }: CompactCardProps) {
  const isLive = event.status === "LIVE";
  const linkHref = href || `/events/${event.id}`;

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return "Soon";
  };

  const timeUntil = event.mintDate && !isLive ? getTimeUntil(event.mintDate) : null;

  const card = (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg bg-bg-card border border-[var(--card-border)] transition-all duration-150",
        "hover:border-[var(--card-border-hover)] hover:shadow-elevation-1",
        "group",
        isLive && "border-glow-live",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {event.host && (
            <p className="text-[10px] text-text-tertiary mb-0.5 truncate">{event.host}</p>
          )}
          <h4 className="text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-brand transition-colors duration-150">
            {event.title}
          </h4>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
          {event.mintDate && (
            <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(new Date(event.mintDate).toISOString())}
            </span>
          )}
          {timeUntil && (
            <span className="text-[10px] text-text-tertiary font-mono">{timeUntil}</span>
          )}
          {event.votesUp !== undefined && (
            <span className="text-[10px] font-bold text-yellow-500 font-mono flex items-center gap-0.5 ml-auto">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {event.votesUp}
            </span>
          )}
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

export function CompactCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-bg-card border border-[var(--card-border)]">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg skeleton flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-1/3 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}
