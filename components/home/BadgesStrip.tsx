"use client";

import * as React from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { useEventsWithBadge } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";
import { BadgeCard, BadgeCardSkeleton } from "@/components/cards/BadgeCard";

export function BadgesStrip() {
  const { data, isLoading } = useEventsWithBadge(6);
  const events = data?.events || [];
  const revealRef = useReveal();

  if (!isLoading && events.length === 0) return null;

  return (
    <section ref={revealRef} className="reveal px-4 sm:px-6">
      {/* Heading with extending rule */}
      <div className="section-heading mb-4">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 flex-shrink-0">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
          Attendance Badges
        </h2>
        <Link href="/calendar?eventType=ECOSYSTEM_MEETUP" className="text-xs text-brand hover:underline flex-shrink-0 ml-auto">
          All meetups
        </Link>
      </div>

      {/* Horizontal scroll rail */}
      <div className="horizontal-scroll scroll-fade-mask pb-1">
        {isLoading ? (
          <>
            <BadgeCardSkeleton />
            <BadgeCardSkeleton />
            <BadgeCardSkeleton />
            <BadgeCardSkeleton />
          </>
        ) : (
          events.map((event: any, i: number) => (
            <div
              key={event.id}
              className="reveal revealed"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <BadgeCard event={event} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
