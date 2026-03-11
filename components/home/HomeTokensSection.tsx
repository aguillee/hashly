"use client";

import * as React from "react";
import Link from "next/link";
import { Coins, TrendingUp, Crown, Medal, Award } from "lucide-react";
import { useTokens } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";
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

const rankConfig: Record<number, { icon: React.ElementType; color: string; glow: string; bg: string }> = {
  1: { icon: Crown, color: "text-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]", bg: "bg-amber-500/5 border-amber-500/20" },
  2: { icon: Medal, color: "text-zinc-400", glow: "shadow-[0_0_10px_rgba(161,161,170,0.12)]", bg: "bg-zinc-400/5 border-zinc-400/15" },
  3: { icon: Award, color: "text-orange-400", glow: "shadow-[0_0_10px_rgba(251,146,60,0.12)]", bg: "bg-orange-500/5 border-orange-500/15" },
};

function formatMC(mc: number | null | undefined): string | null {
  if (!mc || mc <= 0) return null;
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(1)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(0)}K`;
  return `$${mc.toFixed(0)}`;
}

function formatPrice(price: number | null | undefined): string | null {
  if (!price || price <= 0) return null;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(6)}`;
}

export function HomeTokensSection() {
  const { data, isLoading } = useTokens();
  const top5: Token[] = (data?.top || data?.tokens || []).slice(0, 5);
  const revealRef = useReveal();

  if (!isLoading && top5.length === 0) return null;

  return (
    <div ref={revealRef} className="reveal">
      <div className="section-heading mb-4">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 flex-shrink-0">
          <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
          Top Tokens
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
              <div className="flex-1 space-y-1">
                <div className="h-3.5 skeleton rounded w-1/3" />
                <div className="h-2.5 skeleton rounded w-1/2" />
              </div>
              <div className="h-3 w-10 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {top5.map((token, i) => {
            const rank = rankConfig[token.rank];
            const isTop3 = token.rank <= 3;
            const mc = formatMC(token.marketCap);
            const price = formatPrice(token.priceUsd);

            return (
              <a
                key={token.id}
                href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
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
                    <span className="text-xs font-mono text-text-tertiary">#{token.rank}</span>
                  )}
                </div>

                {/* Icon */}
                <div className={cn(
                  "rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0",
                  isTop3 ? "w-10 h-10 ring-1 ring-white/5" : "w-9 h-9"
                )}>
                  {token.icon ? (
                    <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Coins className="h-3.5 w-3.5 text-text-tertiary" />
                    </div>
                  )}
                </div>

                {/* Name + price/MC */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "truncate group-hover:text-brand transition-colors duration-150",
                    isTop3 ? "text-sm font-bold text-text-primary" : "text-sm font-medium text-text-primary"
                  )}>
                    {token.symbol}
                    <span className="text-text-tertiary font-normal text-xs ml-1.5 hidden sm:inline">{token.name}</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-mono">
                    {price && <span>{price}</span>}
                    {mc && (
                      <>
                        {price && <span className="text-border">|</span>}
                        <span>MC {mc}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Votes */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className={cn(
                    "text-xs font-bold font-mono text-green-500",
                    isTop3 && "text-sm"
                  )}>
                    {token.totalVotes > 0 ? `+${token.totalVotes}` : token.totalVotes}
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
