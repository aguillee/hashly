"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  ArrowRight,
  Loader2,
  TrendingUp,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCollections } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  tokenAddress: string;
  name: string;
  totalVotes: number;
  rank: number;
  image?: string;
}

const rankConfig: Record<number, {
  badge: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  1: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    borderColor: "border-l-amber-400",
    icon: Crown,
    label: "1st",
  },
  2: {
    badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    borderColor: "border-l-zinc-400",
    icon: Medal,
    label: "2nd",
  },
  3: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    borderColor: "border-l-orange-400",
    icon: Award,
    label: "3rd",
  },
};

export function TopCollectionsPodium() {
  const { data, isLoading } = useCollections();
  const top5: Collection[] = (data?.top || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (top5.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
          Top Collections
        </h2>
        <Link href="/projects" className="text-sm text-brand hover:underline">
          View all →
        </Link>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {top5.map((collection) => {
          const config = rankConfig[collection.rank];
          const isTop3 = collection.rank <= 3;
          const RankIcon = config?.icon;

          return (
            <Link
              key={collection.id}
              href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className={cn(
                "relative p-2 sm:p-3 h-full rounded-lg border border-[var(--card-border)] bg-bg-card transition-all duration-150 hover:-translate-y-0.5",
                isTop3
                  ? cn("border-l-2", config.borderColor, collection.rank === 1 ? "hover:shadow-glow-gold" : collection.rank === 2 ? "hover:shadow-glow-silver" : "hover:shadow-glow-bronze")
                  : "hover:border-[var(--card-border-hover)] hover:shadow-card-hover"
              )}>
                {/* Rank badge - above image */}
                <div className="flex justify-center mb-1.5">
                  {isTop3 ? (
                    <span className={cn(
                      "rounded-full inline-block px-2 py-0.5 text-[9px] font-medium",
                      config.badge
                    )}>
                      <span className="flex items-center gap-0.5">
                        {RankIcon && <RankIcon className="h-2.5 w-2.5" />}
                        {config.label}
                      </span>
                    </span>
                  ) : (
                    <span className="rounded-full inline-block px-2 py-0.5 text-[9px] font-medium bg-secondary text-secondary font-mono">
                      <span>#{collection.rank}</span>
                    </span>
                  )}
                </div>

                {/* Image */}
                <div className={cn(
                  "mx-auto rounded-md overflow-hidden bg-secondary mb-2",
                  isTop3 ? "w-12 h-12" : "w-10 h-10"
                )}>
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-secondary" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className={cn(
                  "font-bold text-primary truncate text-center transition-colors duration-150",
                  isTop3 ? "text-xs sm:text-sm" : "text-xs"
                )}>
                  {collection.name}
                </p>

                {/* Votes */}
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-center flex items-center justify-center gap-0.5 font-mono">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">
                      {collection.totalVotes > 0 ? `+${collection.totalVotes}` : collection.totalVotes}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
