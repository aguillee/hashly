"use client";

import * as React from "react";
import { Trophy, Medal, Crown, Zap, TrendingUp, Gift, Clock, Users, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/swr";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  alias: string | null;
  points: number;
  missionPoints: number;
  badgePoints: number;
  badgeCount: number;
  totalPoints: number;
}

const SEASON_END = new Date("2026-02-28T23:59:59Z");
const PRIZE_CUTOFF = 8;

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = React.useState(() => {
    const diff = targetDate.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  React.useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, timeLeft]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, ended: timeLeft <= 0 };
}

export default function LeaderboardPage() {
  const { user } = useWalletStore();
  const { data, isLoading: loading } = useLeaderboard();
  const countdown = useCountdown(SEASON_END);

  const leaderboard: LeaderboardEntry[] = data?.leaderboard || [];
  const userRank: number | null = data?.userRank || null;
  const totalUsers: number = data?.totalUsers || 0;
  const userData = data?.userData || null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="h-5 w-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-md bg-bg-secondary border border-border flex items-center justify-center">
            <span className="text-text-secondary font-bold text-sm">#{rank}</span>
          </div>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank <= PRIZE_CUTOFF) {
      switch (rank) {
        case 1:
          return "bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent border-yellow-500/30";
        case 2:
          return "bg-gradient-to-r from-gray-400/10 via-gray-300/5 to-transparent border-gray-400/30";
        case 3:
          return "bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-500/30";
        default:
          return "bg-gradient-to-r from-purple-500/5 via-transparent to-transparent border-purple-500/20 hover:border-purple-500/40";
      }
    }
    return "bg-bg-card/50 border-border/50 hover:border-accent-primary/30 hover:bg-accent-primary/5";
  };

  return (
    <div className="min-h-screen">
      {/* Compact Header - News style */}
      <div className="relative pt-4 pb-4 sm:pt-6 sm:pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-bg-card dark:bg-[#1a1a2e] border-2 border-yellow-500/50 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Leaderboard</h1>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {totalUsers} contributors · Season 0
                </p>
              </div>
            </div>

            {/* Countdown */}
            {countdown.ended ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-500 font-medium">Season ended</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card dark:bg-bg-secondary border border-border">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-text-secondary hidden sm:inline">ends in</span>
                <span className="font-mono text-sm font-bold text-text-primary">
                  {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m
                </span>
                <span className="font-mono text-sm font-bold text-yellow-500">
                  {String(countdown.seconds).padStart(2, "0")}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Prize Banner */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/30 via-purple-500/30 to-yellow-500/30 rounded-lg blur opacity-40" />
          <div className="relative p-5 sm:p-6 rounded-lg bg-bg-card border border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src="https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8"
                  alt="Santuario Hedera"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Season Prize</span>
                </div>
                <p className="text-text-primary font-semibold">
                  Top 1-8 will receive a <span className="text-purple-400">Santuario Hedera NFT</span> as a prize
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User's Rank */}
        {user && userRank && (
          <div className="relative mb-6 sm:mb-8 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg sm:rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative p-4 sm:p-6 rounded-lg sm:rounded-lg bg-bg-card border border-border">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md sm:rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-text-secondary font-medium">Your Rank</p>
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums">#{userRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-text-secondary font-medium">Total Points</p>
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 text-2xl sm:text-3xl font-bold">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
                    <span className="gradient-text tabular-nums">{(userData?.totalPoints ?? user.points ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {/* Points breakdown */}
              {userData && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary/50">
                    <Target className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-[10px] text-text-secondary">Mission Pts</p>
                      <p className="text-sm font-bold text-text-primary tabular-nums">{userData.missionPoints.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary/50">
                    <Award className="h-4 w-4 text-accent-coral" />
                    <div>
                      <p className="text-[10px] text-text-secondary">Badge Pts ({userData.badgeCount})</p>
                      <p className="text-sm font-bold text-text-primary tabular-nums">{userData.badgePoints.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-lg border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-primary">Top 50</h2>
              <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Users className="h-4 w-4" />
                <span>{totalUsers.toLocaleString()} registered users</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gradient-to-r from-bg-secondary to-bg-card animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-accent-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No rankings yet</h3>
                <p className="text-text-secondary">Be the first to earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = user?.walletAddress === entry.walletAddress;
                  const inPrizeZone = entry.rank <= PRIZE_CUTOFF;

                  return (
                    <div
                      key={entry.walletAddress}
                      className={cn(
                        "flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-md sm:rounded-lg border transition-all duration-300 hover-lift",
                        getRankStyle(entry.rank),
                        isCurrentUser && "ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-card"
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-semibold text-text-primary truncate text-sm sm:text-base max-w-[120px] sm:max-w-none">
                            {entry.alias || `${entry.walletAddress.slice(0, 8)}...${entry.walletAddress.slice(-4)}`}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="default" size="sm">
                              You
                            </Badge>
                          )}
                          {inPrizeZone && (
                            <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        {/* Points breakdown on mobile */}
                        <div className="flex items-center gap-2 mt-1 sm:hidden">
                          <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                            <Target className="h-2.5 w-2.5 text-blue-400" />
                            {entry.missionPoints.toLocaleString()}
                          </span>
                          {entry.badgeCount > 0 && (
                            <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                              <Award className="h-2.5 w-2.5 text-accent-coral" />
                              {entry.badgePoints.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Points breakdown - desktop */}
                      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                          <Target className="h-3 w-3 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400 tabular-nums">{entry.missionPoints.toLocaleString()}</span>
                        </div>
                        {entry.badgeCount > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent-coral/10 border border-accent-coral/20">
                            <Award className="h-3 w-3 text-accent-coral" />
                            <span className="text-xs font-medium text-accent-coral tabular-nums">{entry.badgePoints.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Total Points */}
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-md bg-accent-primary/10 border border-accent-primary/20 flex-shrink-0">
                        <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-primary" />
                        <span className="font-bold text-accent-primary text-sm sm:text-base tabular-nums">{entry.totalPoints.toLocaleString()}</span>
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
