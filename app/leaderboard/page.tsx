"use client";

import * as React from "react";
import { Trophy, Medal, Crown, Zap, TrendingUp, Gift, Clock, Users, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  alias: string | null;
  points: number;
  missionPoints: number;
  badgePoints: number;
  badgeCount: number;
  referralPoints: number;
  totalPoints: number;
}

const PRIZE_TIERS = [
  {
    label: "Top 1-5",
    maxRank: 5,
    name: "Santuario Hedera",
    tokenId: "0.0.7235629",
    image: "https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8",
    color: "purple",
  },
  {
    label: "Top 6-12",
    maxRank: 12,
    name: "HashHogs",
    tokenId: "0.0.10233551",
    image: "https://ipfs.io/ipfs/bafybeielr4by7eajkteso4np2qdueuyqdoill7szcd4dnwahfwlthmn6oe/hashhog-_3333.png",
    color: "yellow",
  },
  {
    label: "Top 13-22",
    maxRank: 22,
    name: "Mapache Mafia V2",
    tokenId: "0.0.10296772",
    image: "https://gateway.pinata.cloud/ipfs/bafybeigds67rqvsfhorg6cxjszorgp3gxroavaiiuojvqb2zonwm7rfuk4",
    color: "green",
  },
];

const PRIZE_CUTOFF = PRIZE_TIERS[PRIZE_TIERS.length - 1].maxRank;

function getPrizeTier(rank: number) {
  return PRIZE_TIERS.find((t) => rank <= t.maxRank) || null;
}

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = React.useState(0);

  React.useEffect(() => {
    if (!targetDate) {
      setTimeLeft(0);
      return;
    }

    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      return diff > 0 ? diff : 0;
    };
    setTimeLeft(calc());

    const interval = setInterval(() => {
      const val = calc();
      setTimeLeft(val);
      if (val <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, ended: !targetDate || timeLeft <= 0 };
}

export default function LeaderboardPage() {
  const { user } = useWalletStore();
  const { data, isLoading: loading } = useLeaderboard();

  const seasonEndStr = data?.season?.endDate || null;
  const seasonEndDate = React.useMemo(
    () => (seasonEndStr ? new Date(seasonEndStr) : null),
    [seasonEndStr]
  );
  const seasonName = data?.season?.name || "Season 0";
  const countdown = useCountdown(seasonEndDate);

  const leaderboard: LeaderboardEntry[] = data?.leaderboard || [];
  const userRank: number | null = data?.userRank || null;
  const totalUsers: number = data?.totalUsers || 0;
  const seasonContributors: number = data?.seasonContributors || 0;
  const userData = data?.userData || null;

  const headerRef = useReveal();
  const prizesRef = useReveal();
  const userRef = useReveal();
  const tableRef = useReveal();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.3)]">
            <Crown className="h-5 w-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-300 to-zinc-400 flex items-center justify-center shadow-[0_0_12px_rgba(161,161,170,0.3)]">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-[0_0_12px_rgba(251,146,60,0.3)]">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-border flex items-center justify-center">
            <span className="text-text-secondary font-bold font-mono text-sm">#{rank}</span>
          </div>
        );
    }
  };

  const getRowStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-brand/5 border-l-2 border-l-brand";
    if (rank === 1) return "bg-amber-500/[0.03] border-l-2 border-l-amber-400";
    if (rank === 2) return "bg-zinc-400/[0.03] border-l-2 border-l-zinc-400";
    if (rank === 3) return "bg-orange-400/[0.03] border-l-2 border-l-orange-400";
    if (rank <= PRIZE_CUTOFF) return "border-l-2 border-l-border";
    return "";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="reveal-delay-1">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
                {seasonName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Leaderboard
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                <span className="font-mono">{seasonContributors}</span> contributors competing
              </p>
            </div>

            {/* Countdown */}
            <div className="reveal-delay-2">
              {countdown.ended ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">Season ended</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-card border border-border">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-text-tertiary hidden sm:inline">ends in</span>
                  <span className="text-sm font-bold font-mono text-text-primary">
                    {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m
                  </span>
                  <span className="text-sm font-bold font-mono text-brand">
                    {String(countdown.seconds).padStart(2, "0")}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {/* Prize Tiers */}
        <div ref={prizesRef} className="reveal mb-8">
          <div className="p-5 sm:p-6 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center gap-2 mb-4 reveal-delay-1">
              <Gift className="h-4 w-4 text-text-tertiary" />
              <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-tertiary">Season Prizes</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 reveal-delay-2">
              {PRIZE_TIERS.map((tier) => (
                <div
                  key={tier.tokenId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-bg-secondary/50 border transition-colors",
                    tier.color === "purple" && "border-amber-400/20 hover:border-amber-400/40",
                    tier.color === "yellow" && "border-zinc-400/20 hover:border-zinc-400/40",
                    tier.color === "green" && "border-orange-400/20 hover:border-orange-400/40",
                  )}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                    <img src={tier.image} alt={tier.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">{tier.label}</p>
                    <p className="text-sm font-bold text-text-primary">{tier.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connect wallet / User rank */}
        {!user ? (
          <div ref={userRef} className="reveal mb-8">
            <div className="p-6 rounded-xl bg-bg-card border border-border text-center reveal-delay-1">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-bg-secondary flex items-center justify-center">
                <Trophy className="h-6 w-6 text-text-tertiary" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">Connect wallet to join</h3>
              <p className="text-sm text-text-secondary">Connect your wallet to earn points and compete for prizes.</p>
            </div>
          </div>
        ) : userRank ? (
          <div ref={userRef} className="reveal mb-8">
            <div className="rounded-xl overflow-hidden border border-border bg-bg-card reveal-delay-1">
              {/* Top bar — rank + points */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-text-primary font-mono">#{userRank}</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Your Rank</p>
                    <p className="text-sm font-bold text-text-primary truncate">{user.walletAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border flex-shrink-0">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-lg font-black text-text-primary font-mono tabular-nums">{(userData?.totalPoints ?? user.points ?? 0).toLocaleString()}</span>
                </div>
              </div>
              {/* Bottom bar — breakdown inline */}
              {userData && (
                <div className="flex items-center divide-x divide-border bg-bg-secondary/50 border-t border-border px-1">
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Target className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-[10px] text-blue-400">Mission</span>
                    <span className="text-xs font-bold text-text-primary font-mono ml-auto tabular-nums">{userData.missionPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Award className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                    <span className="text-[10px] text-violet-400">Badge</span>
                    <span className="text-xs font-bold text-text-primary font-mono ml-auto tabular-nums">{userData.badgePoints.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-[10px] text-green-400">Referral</span>
                    <span className="text-xs font-bold text-text-primary font-mono ml-auto tabular-nums">{(userData.referralPoints || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Leaderboard Table */}
        <div ref={tableRef} className="reveal">
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between reveal-delay-1">
              <h2 className="text-lg font-bold text-text-primary">Top 50</h2>
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <Users className="h-3.5 w-3.5" />
                <span className="font-mono">{seasonContributors.toLocaleString()}</span>
                <span className="hidden sm:inline">registered</span>
              </div>
            </div>

            <div className="reveal-delay-2">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-bg-secondary animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-bg-secondary flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">No rankings yet</h3>
                  <p className="text-text-secondary text-sm">Be the first to earn points!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = user?.walletAddress === entry.walletAddress;
                    const inPrizeZone = entry.rank <= PRIZE_CUTOFF;

                    return (
                      <div
                        key={entry.walletAddress}
                        className={cn(
                          "flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 transition-colors duration-150",
                          getRowStyle(entry.rank, !!isCurrentUser)
                        )}
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
                              <Badge variant="brand" size="sm">You</Badge>
                            )}
                            {(() => {
                              const tier = getPrizeTier(entry.rank);
                              if (!tier) return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-secondary text-text-secondary">
                                  <img src={tier.image} alt="" className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm object-cover" />
                                  <span className="hidden sm:inline">{tier.name}</span>
                                </span>
                              );
                            })()}
                          </div>
                          {/* Mobile breakdown */}
                          <div className="flex items-center gap-2 mt-1 sm:hidden">
                            <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                              <Target className="h-2.5 w-2.5 text-blue-500" />
                              <span className="font-mono">{entry.missionPoints.toLocaleString()}</span>
                            </span>
                            {entry.badgeCount > 0 && (
                              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                                <Award className="h-2.5 w-2.5 text-violet-500" />
                                <span className="font-mono">{entry.badgePoints.toLocaleString()}</span>
                              </span>
                            )}
                            {entry.referralPoints > 0 && (
                              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                                <Users className="h-2.5 w-2.5 text-green-600 dark:text-green-500" />
                                <span className="font-mono">{entry.referralPoints.toLocaleString()}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop breakdown */}
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary/50">
                            <Target className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-text-secondary font-mono">{entry.missionPoints.toLocaleString()}</span>
                          </div>
                          {entry.badgeCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary/50">
                              <Award className="h-3 w-3 text-violet-500" />
                              <span className="text-xs text-text-secondary font-mono">{entry.badgePoints.toLocaleString()}</span>
                            </div>
                          )}
                          {entry.referralPoints > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary/50">
                              <Users className="h-3 w-3 text-green-600 dark:text-green-500" />
                              <span className="text-xs text-text-secondary font-mono">{entry.referralPoints.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Total Points */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-bg-secondary border border-border flex-shrink-0">
                          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                          <span className="font-bold text-text-primary text-sm sm:text-base font-mono tabular-nums">{entry.totalPoints.toLocaleString()}</span>
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
    </div>
  );
}
