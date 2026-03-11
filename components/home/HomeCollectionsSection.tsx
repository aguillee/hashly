"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, TrendingUp, Crown, Medal, Award } from "lucide-react";
import { useCollections } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  tokenAddress: string;
  name: string;
  totalVotes: number;
  rank: number;
  image?: string;
}

const rankConfig: Record<number, { icon: React.ElementType; color: string; glow: string; bg: string }> = {
  1: { icon: Crown, color: "text-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]", bg: "bg-amber-500/5 border-amber-500/20" },
  2: { icon: Medal, color: "text-zinc-400", glow: "shadow-[0_0_10px_rgba(161,161,170,0.12)]", bg: "bg-zinc-400/5 border-zinc-400/15" },
  3: { icon: Award, color: "text-orange-400", glow: "shadow-[0_0_10px_rgba(251,146,60,0.12)]", bg: "bg-orange-500/5 border-orange-500/15" },
};

export function HomeCollectionsSection() {
  const { data, isLoading } = useCollections();
  const top5: Collection[] = (data?.top || []).slice(0, 5);
  const revealRef = useReveal();

  if (!isLoading && top5.length === 0) return null;

  return (
    <div ref={revealRef} className="reveal">
      <div className="section-heading mb-4">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 flex-shrink-0">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
          Top Collections
        </h2>
        <Link href="/projects" className="text-xs text-brand hover:underline flex-shrink-0 ml-auto">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
              <div className="w-6 h-4 skeleton rounded" />
              <div className="w-9 h-9 rounded-lg skeleton" />
              <div className="flex-1 h-3.5 skeleton rounded w-2/3" />
              <div className="h-3 w-10 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {top5.map((collection, i) => {
            const rank = rankConfig[collection.rank];
            const isTop3 = collection.rank <= 3;
            return (
              <a
                key={collection.id}
                href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 py-2.5 transition-all duration-200 group -mx-2 px-2 rounded-lg",
                  isTop3
                    ? cn("border", rank?.bg, rank?.glow, "hover:scale-[1.01] mb-1")
                    : "border-b border-border last:border-b-0 hover:bg-bg-secondary/50",
                  `reveal-delay-${i + 1}`
                )}
              >
                {/* Rank */}
                <div className="w-6 flex-shrink-0 text-center">
                  {rank ? (
                    <rank.icon className={cn("h-4 w-4 mx-auto", rank.color)} />
                  ) : (
                    <span className="text-xs font-mono text-text-tertiary">#{collection.rank}</span>
                  )}
                </div>

                {/* Image */}
                <div className={cn(
                  "rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0",
                  isTop3 ? "w-10 h-10 ring-1 ring-white/5" : "w-9 h-9"
                )}>
                  {collection.image ? (
                    <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-text-tertiary" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className={cn(
                  "flex-1 min-w-0 truncate group-hover:text-brand transition-colors duration-150",
                  isTop3 ? "text-sm font-bold text-text-primary" : "text-sm font-medium text-text-primary"
                )}>
                  {collection.name}
                </p>

                {/* Votes */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className={cn(
                    "text-xs font-bold font-mono text-green-500",
                    isTop3 && "text-sm"
                  )}>
                    {collection.totalVotes > 0 ? `+${collection.totalVotes}` : collection.totalVotes}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
