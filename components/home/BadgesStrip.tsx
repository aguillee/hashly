"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Calendar, MapPin, Star, Users } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useEventsWithBadge } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";
import { BadgeCard, BadgeCardSkeleton } from "@/components/cards/BadgeCard";

function BadgeCardFeatured({ event }: { event: any }) {
  const badgeImage = event.badge?.imageUrl || event.imageUrl;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-bg-card border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:shadow-elevation-1 transition-all duration-200">
        {/* Large image */}
        <div className="w-full sm:w-60 aspect-[16/10] sm:aspect-square rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-purple-500/20 ring-offset-2 ring-offset-bg-card">
          {badgeImage ? (
            <img src={badgeImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
              <Award className="h-10 w-10 text-purple-400/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Award className="h-2.5 w-2.5" />
              Badge
            </span>
            {event.votesUp > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                <Star className="h-2.5 w-2.5 fill-yellow-400" />
                {event.votesUp}
              </span>
            )}
            {event.host && (
              <span className="text-xs text-text-tertiary">{event.host}</span>
            )}
          </div>
          <h4 className="text-lg font-bold text-text-primary group-hover:text-purple-400 transition-colors duration-150">
            {event.title}
          </h4>
          {event.description && (
            <p className="text-sm text-text-secondary line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {event.mintDate && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(new Date(event.mintDate).toISOString())}
              </span>
            )}
            {event.location && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
            {event.badge?.supply ? (
              <span className="text-xs text-purple-400 font-mono font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.badge.supply} claimed
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BadgesStrip() {
  const { data, isLoading } = useEventsWithBadge(6);
  const events = data?.events || [];
  const revealRef = useReveal();

  if (!isLoading && events.length === 0) return null;

  return (
    <section ref={revealRef} className="reveal px-4 sm:px-6">
      {/* Heading */}
      <div className="section-heading mb-4">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 flex-shrink-0">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
          Attendance Badges
        </h2>
        <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-xs text-brand hover:underline flex-shrink-0 ml-auto">
          All meetups
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <BadgeCardSkeleton />
          <BadgeCardSkeleton />
          <BadgeCardSkeleton />
        </div>
      ) : events.length === 1 ? (
        <div className="reveal revealed">
          <BadgeCardFeatured event={events[0]} />
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          events.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {events.map((event: any, i: number) => (
            <div key={event.id} className="reveal revealed" style={{ transitionDelay: `${i * 60}ms` }}>
              <BadgeCard event={event} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
