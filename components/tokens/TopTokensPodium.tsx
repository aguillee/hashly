"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  Loader2,
  TrendingUp,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import { useTokens } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface Token {
  id: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  totalVotes: number;
  rank: number;
  icon?: string;
}

const rankConfig: Record<number, {
  badge: string;
  ring: string;
  borderLeft: string;
  cardBg: string;
  icon: React.ElementType;
  label: string;
}> = {
  1: {
    badge: "bg-yellow-500 text-black",
    ring: "ring-1 ring-yellow-400/60",
    borderLeft: "border-l-yellow-500",
    cardBg: "bg-gradient-to-br from-yellow-500/15 via-yellow-400/5 to-transparent",
    icon: Crown,
    label: "1st",
  },
  2: {
    badge: "bg-slate-400 text-gray-800",
    ring: "ring-1 ring-slate-300/50",
    borderLeft: "border-l-slate-400",
    cardBg: "bg-gradient-to-br from-slate-400/15 via-slate-300/5 to-transparent",
    icon: Medal,
    label: "2nd",
  },
  3: {
    badge: "bg-amber-600 text-white",
    ring: "ring-1 ring-amber-600/50",
    borderLeft: "border-l-amber-600",
    cardBg: "bg-gradient-to-br from-amber-600/15 via-amber-500/5 to-transparent",
    icon: Award,
    label: "3rd",
  },
};

export function TopTokensPodium() {
  const { data, isLoading } = useTokens();
  const top5: Token[] = (data?.top || data?.tokens || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-secondary" />
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
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
          <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-accent-secondary" />
          Top Tokens
        </h2>
        <Link href="/projects" className="text-sm text-accent-secondary hover:underline">
          View all →
        </Link>
      </div>

      {/* Horizontal scrollable row on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 pt-2 snap-x snap-mandatory scrollbar-hide">
        {top5.map((token) => {
          const config = rankConfig[token.rank];
          const isTop3 = token.rank <= 3;
          const RankIcon = config?.icon;

          return (
            <div
              key={token.id}
              className="flex-shrink-0 w-[140px] sm:w-auto sm:flex-1 snap-start group"
            >
              <div className={cn(
                "relative p-3 transition-all h-full overflow-hidden border-l-4 rounded-r-lg",
                isTop3
                  ? cn(config.borderLeft, config.cardBg, "hover:brightness-110")
                  : "bg-bg-card/80 border-l-border hover:border-l-accent-secondary/50"
              )}>
                {/* Rank badge - skewed tag style */}
                <div className="absolute top-2 right-2">
                  {isTop3 ? (
                    <span className={cn(
                      "skew-tag inline-block px-2 py-0.5 text-[9px] font-bold tracking-wide",
                      config.badge
                    )}>
                      <span className="flex items-center gap-0.5">
                        {RankIcon && <RankIcon className="h-2.5 w-2.5" />}
                        {config.label}
                      </span>
                    </span>
                  ) : (
                    <span className="skew-tag inline-block px-2 py-0.5 text-[9px] font-bold tracking-wide bg-bg-secondary text-text-secondary">
                      <span>#{token.rank}</span>
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className={cn(
                  "mx-auto rounded-md overflow-hidden bg-bg-secondary mb-2",
                  isTop3 ? "w-12 h-12" : "w-10 h-10",
                  config?.ring || ""
                )}>
                  {token.icon ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Coins className="h-4 w-4 text-text-secondary" />
                    </div>
                  )}
                </div>

                {/* Symbol */}
                <p className={cn(
                  "font-bold text-text-primary truncate text-center group-hover:text-accent-secondary transition-colors",
                  isTop3 ? "text-sm" : "text-xs"
                )}>
                  {token.symbol}
                </p>

                {/* Name */}
                <p className="text-[10px] text-text-secondary truncate text-center">
                  {token.name}
                </p>

                {/* Votes */}
                <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                  <p className="text-xs font-bold text-center flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500 font-mono">
                      {token.totalVotes > 0 ? `+${token.totalVotes}` : token.totalVotes}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
