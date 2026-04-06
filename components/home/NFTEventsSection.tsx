"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Lightning, Fire, Rocket, Star, Hexagon } from "@phosphor-icons/react";
import { useFeatured } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";
import { cn, formatDate } from "@/lib/utils";

function getTimeUntil(dateString: string): string | null {
  const now = new Date();
  const date = new Date(dateString);
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "Soon";
}

interface ColumnCardProps {
  event: {
    id: string;
    title: string;
    imageUrl?: string | null;
    mintDate?: string | null;
    status?: string;
    votesUp?: number;
    votesDown?: number;
    host?: string;
  };
  label: string;
  icon: React.ElementType;
}

function EventColumnCard({ event, label, icon: Icon }: ColumnCardProps) {
  const isLive = event.status === "LIVE";
  const timeUntil = event.mintDate && !isLive ? getTimeUntil(event.mintDate) : null;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div
        className={cn(
          "rounded-xl bg-bg-card border border-[var(--card-border)] overflow-hidden transition-all duration-200",
          "hover:border-[var(--card-border-hover)] hover:shadow-elevation-1",
          isLive && "border-glow-live"
        )}
      >
        {/* Image */}
        <div className="aspect-[16/10] w-full overflow-hidden bg-bg-secondary relative">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary" />
          )}
          {/* Label pill top-left */}
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm",
                isLive
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-bg-primary/60 text-text-secondary border border-border/50"
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {isLive ? "LIVE" : label}
            </span>
          </div>
          {/* Votes top-right */}
          {event.votesUp !== undefined && (event.votesUp - (event.votesDown || 0)) > 0 && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-primary/60 backdrop-blur-sm text-yellow-500 border border-border/50">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {event.votesUp - (event.votesDown || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {event.host && (
            <p className="text-[10px] text-text-tertiary mb-0.5 truncate">{event.host}</p>
          )}
          <h4 className="text-sm font-bold text-text-primary line-clamp-1 leading-snug group-hover:text-brand transition-colors duration-150">
            {event.title}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
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
              <span className="text-[10px] text-text-tertiary font-mono flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {timeUntil}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ColumnCardSkeleton() {
  return (
    <div className="rounded-xl bg-bg-card border border-[var(--card-border)] overflow-hidden">
      <div className="aspect-[16/10] w-full skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-1/3 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}

export function NFTEventsSection() {
  const { data: featured, isLoading } = useFeatured();
  const revealRef = useReveal();

  const events: Array<{ event: any; label: string; icon: React.ElementType }> = [];

  if (featured?.mostVotedLive) {
    events.push({ event: featured.mostVotedLive, label: "Live Now", icon: Lightning });
  }
  if (featured?.mostVoted && featured.mostVoted.id !== featured?.mostVotedLive?.id) {
    events.push({ event: featured.mostVoted, label: "Most Voted", icon: Fire });
  }
  if (featured?.nextUp && !events.find((e) => e.event.id === featured.nextUp?.id)) {
    events.push({ event: featured.nextUp, label: "Minting Soon", icon: Rocket });
  }

  if (!isLoading && events.length === 0) return null;

  return (
    <section ref={revealRef} className="reveal px-4 sm:px-6">
      <div className="section-heading mb-4">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 flex-shrink-0">
          <Hexagon className="h-4 w-4 sm:h-5 sm:w-5 text-brand" weight="duotone" />
          NFT Events
        </h2>
        <Link href="/calendar" className="text-xs text-brand hover:underline flex-shrink-0 ml-auto">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColumnCardSkeleton />
          <ColumnCardSkeleton />
          <ColumnCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((item, i) => (
            <div key={item.event.id} className={`reveal-delay-${i + 1}`}>
              <EventColumnCard event={item.event} label={item.label} icon={item.icon} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
