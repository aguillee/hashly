"use client";

import * as React from "react";
import { Trophy, Medal, Crown, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/swr";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  alias: string | null;
  points: number;
}

export default function LeaderboardPage() {
  const { user } = useWalletStore();
  const { data, isLoading: loading } = useLeaderboard();

  const leaderboard: LeaderboardEntry[] = data?.leaderboard || [];
  const userRank: number | null = data?.userRank || null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="h-5 w-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border flex items-center justify-center">
            <span className="text-text-secondary font-bold text-sm">#{rank}</span>
          </div>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 via-gray-300/5 to-transparent border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-500/30";
      default:
        return "bg-bg-card/50 border-border/50 hover:border-accent-primary/30 hover:bg-accent-primary/5";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-accent-secondary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-500/30 mb-6">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Leaderboard</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Top contributors in the Hedera Mint Calendar community
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* User's Rank */}
        {user && userRank && (
          <div className="relative mb-8 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative p-6 rounded-3xl bg-bg-card border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary font-medium">Your Rank</p>
                    <p className="text-3xl font-bold text-text-primary">#{userRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary font-medium">Your Points</p>
                  <div className="flex items-center gap-2 text-3xl font-bold">
                    <Zap className="h-6 w-6 text-accent-primary" />
                    <span className="gradient-text">{(user.points ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-3xl border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">Top 50</h2>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gradient-to-r from-bg-secondary to-bg-card animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-accent-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No rankings yet</h3>
                <p className="text-text-secondary">Be the first to earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = user?.walletAddress === entry.walletAddress;

                  return (
                    <div
                      key={entry.walletAddress}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                        getRankStyle(entry.rank),
                        isCurrentUser && "ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-card"
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Rank */}
                      {getRankIcon(entry.rank)}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-primary truncate">
                            {entry.alias || entry.walletAddress}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="default" size="sm">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
                        <Zap className="h-4 w-4 text-accent-primary" />
                        <span className="font-bold text-accent-primary">{entry.points.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
