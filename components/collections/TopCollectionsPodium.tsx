"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  Crown,
  Medal,
  ArrowRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCollections } from "@/lib/swr";

interface Collection {
  id: string;
  tokenAddress: string;
  name: string;
  totalVotes: number;
  rank: number;
  image?: string;
}

export function TopCollectionsPodium() {
  const { data, isLoading } = useCollections();
  const top5: Collection[] = (data?.top || []).slice(0, 5);
  const topCollections = top5.slice(0, 3);
  const runnerUps = top5.slice(3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (topCollections.length === 0) {
    return null;
  }

  const podiumOrder = topCollections.length >= 3
    ? [topCollections[1], topCollections[0], topCollections[2]]
    : topCollections;

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          height: "h-28 sm:h-40",
          bg: "bg-gradient-to-t from-yellow-500/20 to-yellow-400/5",
          border: "border-yellow-500/40",
          icon: <Crown className="h-6 w-6 text-yellow-400" />,
          label: "bg-yellow-500/90 text-black",
          glow: "shadow-lg shadow-yellow-500/20",
        };
      case 2:
        return {
          height: "h-20 sm:h-32",
          bg: "bg-gradient-to-t from-gray-400/20 to-gray-300/5",
          border: "border-gray-400/40",
          icon: <Medal className="h-5 w-5 text-gray-300" />,
          label: "bg-gray-400/90 text-white",
          glow: "",
        };
      case 3:
        return {
          height: "h-16 sm:h-28",
          bg: "bg-gradient-to-t from-amber-600/20 to-amber-500/5",
          border: "border-amber-600/40",
          icon: <Medal className="h-5 w-5 text-amber-500" />,
          label: "bg-amber-600/90 text-white",
          glow: "",
        };
      default:
        return {
          height: "h-20",
          bg: "bg-bg-card",
          border: "border-border",
          icon: null,
          label: "bg-bg-secondary text-text-secondary",
          glow: "",
        };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-primary">Top Collections</h2>
            <p className="text-text-secondary text-xs sm:text-sm">Most voted by the community</p>
          </div>
        </div>
        <Link href="/collections">
          <Button variant="ghost" size="sm" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-lg mx-auto px-2">
        {podiumOrder.map((collection) => {
          const style = getPodiumStyle(collection.rank);

          return (
            <Link
              key={collection.id}
              href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-[140px] sm:max-w-[180px] group"
            >
              <div className="text-center mb-2 sm:mb-3">
                {/* Collection image or icon */}
                <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl overflow-hidden border-2 ${style.border} ${style.glow} bg-bg-secondary mb-1.5 sm:mb-2`}>
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {style.icon}
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className="text-xs sm:text-sm font-semibold text-text-primary truncate group-hover:text-accent-primary transition-colors px-1">
                  {collection.name}
                </p>

                {/* Votes */}
                <p className={`text-xs font-bold mt-0.5 sm:mt-1 ${collection.totalVotes >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {collection.totalVotes > 0 ? `+${collection.totalVotes}` : collection.totalVotes} votes
                </p>
              </div>

              {/* Podium bar */}
              <div className={`${style.height} ${style.bg} border ${style.border} rounded-t-xl flex items-start justify-center pt-2 sm:pt-3 transition-all group-hover:brightness-110`}>
                <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold ${style.label}`}>
                  #{collection.rank}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Runner-ups: #4 and #5 */}
      {runnerUps.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 max-w-lg mx-auto">
          {runnerUps.map((collection) => (
            <Link
              key={collection.id}
              href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 group"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-card/50 border border-border/50 hover:border-accent-primary/30 transition-all">
                <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-text-secondary">
                  #{collection.rank}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-text-secondary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-primary transition-colors">
                    {collection.name}
                  </p>
                  <p className={`text-xs font-bold ${collection.totalVotes >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {collection.totalVotes > 0 ? `+${collection.totalVotes}` : collection.totalVotes} votes
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
