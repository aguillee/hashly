"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Calendar } from "lucide-react";
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
          "flex gap-3 p-3 rounded-xl bg-bg-card border border-[var(--card-border)] transition-all duration-150",
          "hover:border-[var(--card-border-hover)] hover:shadow-elevation-2",
          "w-[260px] flex-shrink-0",
          className
        )}
      >
        {/* Badge image — square with purple glow ring */}
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-purple-500/20 ring-offset-1 ring-offset-bg-card">
          {badgeImage ? (
            <img
              src={badgeImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-text-primary line-clamp-1 group-hover:text-purple-400 transition-colors duration-150">
              {event.title}
            </h4>
            {event.host && (
              <p className="text-[10px] text-text-tertiary truncate mt-0.5">{event.host}</p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {event.mintDate && (
              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {event.badge?.supply !== undefined && (
              <span className="text-[10px] text-purple-400 font-mono font-medium">
                {event.badge.supply} claimed
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-[var(--card-border)] w-[260px] flex-shrink-0">
      <div className="w-14 h-14 rounded-lg skeleton ring-2 ring-purple-500/10 ring-offset-1" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3.5 w-full skeleton rounded" />
        <div className="h-2.5 w-2/3 skeleton rounded" />
        <div className="h-2.5 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}
