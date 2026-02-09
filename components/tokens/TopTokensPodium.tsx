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
  glow: string;
  border: string;
  icon: React.ElementType;
  label: string;
}> = {
  1: {
    badge: "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30",
    ring: "ring-2 ring-yellow-400/60",
    glow: "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-yellow-400/10 before:to-amber-500/5",
    border: "border-yellow-500/40 hover:border-yellow-400/70",
    icon: Crown,
    label: "1st",
  },
  2: {
    badge: "bg-gradient-to-br from-slate-300 to-gray-400 text-gray-800 shadow-lg shadow-gray-400/25",
    ring: "ring-2 ring-slate-300/50",
    glow: "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-slate-300/15 before:to-gray-400/10",
    border: "border-slate-400/50 hover:border-slate-300/80 shadow-sm shadow-slate-400/10",
    icon: Medal,
    label: "2nd",
  },
  3: {
    badge: "bg-gradient-to-br from-amber-600 to-orange-700 text-amber-100 shadow-lg shadow-amber-600/20",
    ring: "ring-2 ring-amber-600/50",
    glow: "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-amber-600/15 before:to-orange-600/10",
    border: "border-amber-600/50 hover:border-amber-500/80 shadow-sm shadow-amber-600/10",
    icon: Award,
    label: "3rd",
  },
};

export function TopTokensPodium() {
  const { data, isLoading } = useTokens();
  const top5: Token[] = (data?.tokens || []).slice(0, 5);

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
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 pt-3 snap-x snap-mandatory scrollbar-hide">
        {top5.map((token) => {
          const config = rankConfig[token.rank];
          const isTop3 = token.rank <= 3;
          const RankIcon = config?.icon;

          return (
            <div
              key={token.id}
              className="flex-shrink-0 w-[150px] sm:w-auto sm:flex-1 snap-start group"
            >
              <div className={cn(
                "relative p-3 rounded-xl border bg-bg-card transition-all h-full overflow-hidden",
                isTop3
                  ? cn(config.border, config.glow)
                  : "border-border/50 hover:border-accent-secondary/40"
              )}>
                {/* Rank badge - bigger and more visible */}
                {isTop3 ? (
                  <div className={cn(
                    "absolute -top-1 -right-1 flex items-center gap-1 px-2 py-1 rounded-bl-lg rounded-tr-xl text-xs font-extrabold z-10",
                    config.badge
                  )}>
                    {RankIcon && <RankIcon className="h-3.5 w-3.5" />}
                    {config.label}
                  </div>
                ) : (
                  <span className="absolute -top-1 -right-1 px-2 py-1 rounded-bl-lg rounded-tr-xl text-[11px] font-bold bg-bg-secondary text-text-secondary z-10">
                    #{token.rank}
                  </span>
                )}

                {/* Icon */}
                <div className={cn(
                  "mx-auto rounded-full overflow-hidden bg-bg-secondary mb-2",
                  isTop3 ? "w-14 h-14" : "w-12 h-12",
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
                      <Coins className="h-5 w-5 text-text-secondary" />
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
                <p className="text-xs font-bold text-center mt-1 flex items-center justify-center gap-0.5">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">
                    {token.totalVotes > 0 ? `+${token.totalVotes}` : token.totalVotes}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
