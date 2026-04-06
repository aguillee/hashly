"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Calendar, Star } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface BadgeCardProps {
  event: {
    id: string;
    title: string;
    imageUrl?: string | null;
    mintDate?: string | null;
    host?: string;
    votesUp?: number;
    badge?: {
      supply?: number;
      imageUrl?: string | null;
    } | null;
  };
  className?: string;
}

export function BadgeCard({ event, className }: BadgeCardProps) {
  const badgeImage = event.badge?.imageUrl || event.imageUrl;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div
        className={cn(
          "rounded-xl bg-bg-card border border-[var(--card-border)] overflow-hidden transition-all duration-200",
          "hover:border-[var(--card-border-hover)] hover:shadow-elevation-1",
          className
        )}
      >
        {/* Image */}
        <div className="aspect-[16/10] w-full overflow-hidden bg-bg-secondary relative">
          {badgeImage ? (
            <img
              src={badgeImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary flex items-center justify-center">
              <Award className="h-10 w-10 text-purple-400/40" />
            </div>
          )}
          {/* Badge pill top-left */}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Award className="h-2.5 w-2.5" />
              Badge
            </span>
          </div>
          {/* Community stars top-right */}
          {event.votesUp != null && event.votesUp > 0 && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono backdrop-blur-sm bg-bg-primary/60 text-yellow-400 border border-yellow-500/30">
                <Star className="h-2.5 w-2.5 fill-yellow-400" />
                {event.votesUp}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-medium text-purple-400">Attendance Badge</span>
            {event.host && (
              <>
                <span className="text-text-tertiary text-[10px] mx-0.5">&middot;</span>
                <span className="text-[10px] text-text-tertiary truncate">{event.host}</span>
              </>
            )}
          </div>
          <h4 className="text-sm font-bold text-text-primary line-clamp-1 leading-snug group-hover:text-purple-400 transition-colors duration-150">
            {event.title}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            {event.mintDate && (
              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {event.badge?.supply ? (
              <span className="text-[10px] text-purple-400 font-mono font-medium">
                {event.badge.supply} claimed
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="rounded-xl bg-bg-card border border-[var(--card-border)] overflow-hidden">
      <div className="aspect-[16/10] w-full skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 w-1/3 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}
