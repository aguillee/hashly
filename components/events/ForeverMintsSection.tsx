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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { parseMintPrice } from "@/lib/utils";
import { useForeverMints } from "@/lib/swr";

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
}

export function ForeverMintsSection() {
  const { data, isLoading: loading } = useForeverMints({ limit: 6 });
  const mints: ForeverMint[] = data?.items || [];

  if (loading) {
    return (
      <section className="py-12">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Infinity className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Forever Mints</h2>
            <p className="text-text-secondary text-sm">Always available to mint</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mints.map((mint) => (
          <ForeverMintCard key={mint.id} mint={mint} />
        ))}
      </div>
    </section>
  );
}

function ForeverMintCard({ mint }: { mint: ForeverMint }) {
  const priceInfo = parseMintPrice(mint.mintPrice);
  const score = mint.votesUp - mint.votesDown;

  return (
    <div className="group relative">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20" />

      <Card className="relative overflow-hidden rounded-3xl border-border/50 bg-bg-card/80 backdrop-blur-sm">
        {/* Image */}
        <Link href={`/events/${mint.id}`}>
          <div className="relative h-44 bg-gradient-to-br from-bg-secondary to-bg-card overflow-hidden">
            {mint.imageUrl ? (
              <img
                src={mint.imageUrl}
                alt={mint.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-purple-500/20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Infinity className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60" />

            {/* Forever Badge */}
            <div className="absolute top-3 left-3">
              <Badge className="bg-purple-500/90 text-white border-purple-400/50 shadow-lg">
                <Infinity className="h-3 w-3 mr-1" />
                Always Live
              </Badge>
            </div>

            {/* Score */}
            {score !== 0 && (
              <div className="absolute top-3 right-3">
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    score > 0
                      ? "bg-success/90 text-white"
                      : "bg-error/90 text-white"
                  }`}
                >
                  {score > 0 ? `+${score}` : score}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-4 space-y-3">
          <Link href={`/events/${mint.id}`}>
            <h3 className="font-bold text-base line-clamp-1 text-text-primary group-hover:text-purple-400 transition-colors duration-300">
              {mint.title}
            </h3>
          </Link>

          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {mint.description?.replace(/<[^>]*>/g, "").slice(0, 100)}...
          </p>

          {/* Price & Supply */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              {priceInfo.isHbar ? (
                <HbarIcon className="h-4 w-4" />
              ) : (
                <UsdcIcon className="h-4 w-4" />
              )}
              <span className="font-semibold text-xs text-purple-400">
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
            <Link href={`/events/${mint.id}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                Details
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
            {mint.websiteUrl && (
              <a
                href={mint.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className="gap-1 text-xs h-8 bg-purple-500 hover:bg-purple-600"
                >
                  Mint Now
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
