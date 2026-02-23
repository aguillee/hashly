"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";

interface HomeAd {
  id: string;
  type: "EVENT" | "CUSTOM";
  eventId: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  title: string | null;
  duration: number;
  event: {
    id: string;
    title: string;
    imageUrl: string | null;
    mintDate: string | null;
    status: string;
    votesUp: number;
    event_type: string;
  } | null;
}

interface HomeAdCarouselProps {
  ads: HomeAd[];
}

// Fire-and-forget tracking
function trackAdEvent(adId: string, type: "view" | "click") {
  fetch("/api/home-ads/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adId, type }),
  }).catch(() => {});
}

function AdSlide({ ad, isActive, onClickTrack }: { ad: HomeAd; isActive: boolean; onClickTrack: () => void }) {
  const image =
    ad.type === "EVENT" && ad.event ? ad.event.imageUrl : ad.imageUrl;
  const title =
    ad.type === "EVENT" && ad.event ? ad.event.title : ad.title;
  const href =
    ad.type === "EVENT" && ad.event
      ? `/events/${ad.event.id}`
      : ad.linkUrl;
  const isExternal = ad.type === "CUSTOM" && ad.linkUrl;

  const content = (
    <div className="absolute inset-0 group cursor-pointer" onClick={onClickTrack}>
      {/* Image */}
      <div className="relative h-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10">
        {image ? (
          <img
            src={image}
            alt={title || ""}
            className="w-full h-full object-cover transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* Content overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 transition-all duration-500"
        style={{
          opacity: isActive ? 1 : 0,
          transform: isActive ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {title && (
          <h4 className="text-sm font-bold text-white line-clamp-2 mb-1 group-hover:text-accent-primary transition-colors">
            {title}
          </h4>
        )}
        {ad.type === "EVENT" && ad.event && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">
              {ad.event.votesUp}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (ad.type === "EVENT" && href) {
    return (
      <Link href={href} className="absolute inset-0" onClick={onClickTrack}>
        {content}
      </Link>
    );
  }

  if (isExternal && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="absolute inset-0" onClick={onClickTrack}>
        {content}
      </a>
    );
  }

  return content;
}

export function HomeAdCarousel({ ads }: HomeAdCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const trackedViewsRef = React.useRef<Set<string>>(new Set());

  const currentAd = ads[currentIndex];
  const hasMultiple = ads.length > 1;

  // Track view when ad becomes visible
  React.useEffect(() => {
    if (!currentAd) return;
    const key = `${currentAd.id}-${currentIndex}`;
    if (!trackedViewsRef.current.has(key)) {
      trackedViewsRef.current.add(key);
      trackAdEvent(currentAd.id, "view");
    }
  }, [currentIndex, currentAd]);

  // Auto-rotate based on each ad's duration
  React.useEffect(() => {
    if (!hasMultiple || !currentAd) return;

    const durationMs = currentAd.duration * 1000;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, ads, hasMultiple, currentAd]);

  if (!currentAd) return null;

  return (
    <div className="relative h-full rounded-xl overflow-hidden border border-border/50 bg-bg-card">
      {/* All slides stacked - crossfade via opacity */}
      {ads.map((ad, i) => (
        <div
          key={ad.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === currentIndex ? 1 : 0,
            zIndex: i === currentIndex ? 10 : 1,
            pointerEvents: i === currentIndex ? "auto" : "none",
          }}
        >
          <AdSlide
            ad={ad}
            isActive={i === currentIndex}
            onClickTrack={() => trackAdEvent(ad.id, "click")}
          />
        </div>
      ))}

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="absolute top-2 right-2 flex gap-1.5 z-20">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
