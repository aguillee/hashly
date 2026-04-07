"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Infinity,
  ArrowRight,
  Box,
  Loader2,
  ArrowUpRight,
  Fish,
  Sparkles,
  Crown,
  Gem,
  Shell,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { parseMintPrice } from "@/lib/utils";
import { useForeverMints } from "@/lib/swr";
import { ShareToXButton } from "@/components/ui/ShareToXButton";

interface DreamCastMetadata {
  dreamcast: true;
  badge: string | null;
  buybackEnabled: boolean;
  tiers: Record<string, number>;
  stats: {
    totalCatches: number;
    totalVolume: string;
    buybackVolume?: string;
    keeperCatches?: number;
    krakenCatches?: number;
    totalBuybacks?: number;
    smallFryCatches?: number;
  };
  previews: { image: string | null; tier: string; name?: string }[];
}

interface ForeverMint {
  id: string;
  title: string;
  description: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  votesUp: number;
  votesDown: number;
  source?: string;
  metadata?: DreamCastMetadata | null;
}

export function ForeverMintsSection() {
  const { data, isLoading: loading } = useForeverMints({ limit: 6 });
  const mints: ForeverMint[] = data?.items || [];

  if (loading) {
    return (
      <section className="py-12">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </section>
    );
  }

  if (mints.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-md sm:rounded-lg bg-purple-500/10">
            <Infinity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-primary">Forever Mints</h2>
            <p className="text-text-secondary text-xs sm:text-sm">Always available to mint</p>
          </div>
        </div>
        <Link href="/calendar?foreverMints=only">
          <Button variant="ghost" size="sm" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mints.map((mint) => (
          <ForeverMintCard key={mint.id} mint={mint} />
        ))}
      </div>
    </section>
  );
}

// Tier styling - dynamic, adapts to whatever tiers the API sends
const TIER_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  kraken: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  hydra: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  siren: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  keeper: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  smallFry: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

const DEFAULT_TIER_STYLE = { color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" };

function getTierStyle(tier: string) {
  return TIER_STYLES[tier] || DEFAULT_TIER_STYLE;
}

function formatTierName(tier: string) {
  // camelCase → Title Case (e.g. "smallFry" → "Small Fry")
  return tier.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function ForeverMintCard({ mint }: { mint: ForeverMint }) {
  const priceInfo = parseMintPrice(mint.mintPrice);
  const score = Math.max(0, mint.votesUp) - Math.max(0, mint.votesDown);
  const isDreamCast = mint.metadata?.dreamcast === true;
  const tiers = isDreamCast ? mint.metadata?.tiers : null;
  const stats = isDreamCast ? mint.metadata?.stats : null;

  return (
    <div className="group relative">
      <Card className={`relative overflow-hidden rounded-lg border-border bg-bg-card ${isDreamCast ? "border-pink-500/20" : ""}`}>
        {/* Image */}
        <Link href={`/events/${mint.id}`}>
          <div className="relative h-36 sm:h-44 bg-bg-secondary overflow-hidden">
            {mint.imageUrl ? (
              <img
                src={mint.imageUrl}
                alt={mint.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-purple-500/5">
                <div className="w-16 h-16 rounded-lg bg-purple-500/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Infinity className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60" />

            {/* Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {isDreamCast ? (
                <Badge className="bg-pink-500/90 text-white border-pink-400/50 shadow-lg">
                  <Fish className="h-3 w-3 mr-1" />
                  DreamCast
                </Badge>
              ) : (
                <Badge className="bg-purple-500/90 text-white border-purple-400/50 shadow-lg">
                  <Infinity className="h-3 w-3 mr-1" />
                  Always Live
                </Badge>
              )}
              {isDreamCast && mint.metadata?.badge === "official" && (
                <Badge className="bg-blue-500/90 text-white border-blue-400/50 shadow-lg text-[10px] px-1.5">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Official
                </Badge>
              )}
            </div>

            {/* Score */}
            <div className="absolute top-3 right-3">
              <div
                className={`px-3 py-1.5 rounded-md text-sm font-bold shadow-lg flex items-center gap-1.5 ${
                  score > 0
                    ? "bg-green-500/10 text-green-500"
                    : score < 0
                    ? "bg-red-500/10 text-red-500"
                    : "bg-bg-secondary text-text-secondary"
                }`}
              >
                <span className="text-base">{score > 0 ? "▲" : score < 0 ? "▼" : "•"}</span>
                {score > 0 ? `+${score}` : score}
              </div>
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-4 space-y-3">
          <Link href={`/events/${mint.id}`}>
            <h3 className={`font-bold text-base line-clamp-1 text-text-primary transition-colors duration-300 ${isDreamCast ? "group-hover:text-pink-400" : "group-hover:text-purple-400"}`}>
              {mint.title}
            </h3>
          </Link>

          {/* DreamCast Tiers */}
          {isDreamCast && tiers && Object.keys(tiers).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(tiers)
                .sort(([, a], [, b]) => a - b) // rarest first (lowest count)
                .map(([tier, count]) => {
                  const style = getTierStyle(tier);
                  return (
                    <div
                      key={tier}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.color} border ${style.border}`}
                    >
                      <span>{formatTierName(tier)}</span>
                      <span className="opacity-70">x{count}</span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* DreamCast Stats */}
          {isDreamCast && stats && stats.totalCatches > 0 && (
            <div className="flex items-center gap-3 text-[10px] text-text-secondary">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-pink-400" />
                {stats.totalCatches} catches
              </span>
              {stats.totalVolume && parseInt(stats.totalVolume) > 0 && (
                <span className="flex items-center gap-1">
                  <HbarIcon className="h-3 w-3" />
                  {(parseInt(stats.totalVolume) / 100_000_000).toLocaleString()} vol
                </span>
              )}
            </div>
          )}

          {!isDreamCast && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {mint.description?.replace(/<[^>]*>/g, "").slice(0, 100)}...
            </p>
          )}

          {/* Price & Supply */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${isDreamCast ? "bg-pink-500/10 border-pink-500/20" : "bg-purple-500/10 border-purple-500/20"}`}>
              {priceInfo.isHbar ? (
                <HbarIcon className="h-4 w-4" />
              ) : (
                <UsdcIcon className="h-4 w-4" />
              )}
              <span className={`font-semibold text-xs ${isDreamCast ? "text-pink-400" : "text-purple-400"}`}>
                {priceInfo.value}
              </span>
            </div>
            {mint.supply && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border">
                <Box className="h-3.5 w-3.5 text-text-secondary" />
                <span className="font-medium text-xs text-text-primary">
                  {mint.supply.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Link href={`/events/${mint.id}`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                  Details
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
              <ShareToXButton
                shareText={`Check out ${mint.title} on @hashly_h ${isDreamCast ? "🎣" : "♾️"}\n\n${isDreamCast ? "Cast your line!" : "Always available to mint!"}`}
                shareUrl={`https://hash-ly.com/events/${mint.id}`}
                className="h-8 w-8 p-0 flex items-center justify-center"
              />
            </div>
            {mint.websiteUrl && (
              <a
                href={mint.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className={`gap-1 text-xs h-8 ${isDreamCast ? "bg-pink-500 hover:bg-pink-600" : "bg-purple-500 hover:bg-purple-600"}`}
                >
                  {isDreamCast ? "Cast Now" : "Mint Now"}
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
