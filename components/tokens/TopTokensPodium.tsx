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
  priceUsd?: number | null;
  marketCap?: number | null;
}

const rankConfig: Record<number, {
  badge: string;
  ring: string;
  ringPulse: string;
  borderLeft: string;
  cardBg: string;
  cardEffect: string;
  shimmerColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  1: {
    badge: "bg-yellow-500 text-black podium-badge-shine",
    ring: "ring-2 ring-yellow-400/60",
    ringPulse: "podium-ring-pulse-1",
    borderLeft: "border-yellow-500/40 hover:border-yellow-500/70",
    cardBg: "bg-[#fef9e7] dark:bg-[#1a1a0e]",
    cardEffect: "podium-card-1",
    shimmerColor: "via-yellow-400/10",
    icon: Crown,
    label: "1st",
  },
  2: {
    badge: "bg-slate-400 text-gray-800 podium-badge-shine",
    ring: "ring-2 ring-slate-300/50",
    ringPulse: "podium-ring-pulse-2",
    borderLeft: "border-slate-400/40 hover:border-slate-400/70",
    cardBg: "bg-[#f1f5f9] dark:bg-[#161a22]",
    cardEffect: "podium-card-2",
    shimmerColor: "via-slate-300/10",
    icon: Medal,
    label: "2nd",
  },
  3: {
    badge: "bg-amber-600 text-white podium-badge-shine",
    ring: "ring-2 ring-amber-600/50",
    ringPulse: "podium-ring-pulse-3",
    borderLeft: "border-amber-600/40 hover:border-amber-600/70",
    cardBg: "bg-[#fef3e2] dark:bg-[#1a150e]",
    cardEffect: "podium-card-3",
    shimmerColor: "via-amber-500/10",
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
            <a
              key={token.id}
              href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-[140px] sm:w-auto sm:flex-1 snap-start group"
            >
              <div className={cn(
                "relative p-3 transition-all h-full overflow-hidden rounded-lg cursor-pointer",
                isTop3
                  ? cn("border", config.borderLeft, config.cardBg, config.cardEffect)
                  : "border border-border/50 bg-bg-card hover:border-accent-secondary/30"
              )}>
                {/* Top 3 shimmer sweep */}
                {isTop3 && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                    <div className={cn("absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-shimmer", config.shimmerColor)} style={{ backgroundSize: '200% 100%' }} />
                  </div>
                )}
                {/* Rank badge - skewed tag style */}
                <div className="absolute top-2 right-2">
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
                    <span className="rounded-full inline-block px-2 py-0.5 text-[9px] font-medium bg-bg-secondary text-text-secondary">
                      <span>#{token.rank}</span>
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className={cn(
                  "mx-auto rounded-md overflow-hidden bg-bg-secondary mb-2",
                  isTop3 ? "w-12 h-12" : "w-10 h-10",
                  config?.ring || "",
                  isTop3 ? config?.ringPulse : ""
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

                {/* Market Cap */}
                {token.marketCap && token.marketCap > 0 && (
                  <div className="mt-1.5 text-center">
                    <p className="text-[10px] text-text-secondary">
                      MC: ${token.marketCap >= 1000000
                        ? `${(token.marketCap / 1000000).toFixed(1)}M`
                        : token.marketCap >= 1000
                          ? `${(token.marketCap / 1000).toFixed(0)}K`
                          : token.marketCap.toFixed(0)}
                    </p>
                  </div>
                )}

                {/* Votes */}
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-center flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">
                      {token.totalVotes > 0 ? `+${token.totalVotes}` : token.totalVotes}
                    </span>
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
