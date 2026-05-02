"use client";

import * as React from "react";
import { Trophy, Medal, Crown, Zap, TrendingUp, Gift, Users, Award, Target, CheckCircle } from "lucide-react";
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

/* ── Prize Tiers ─────────────────────────────────────────── */
// Season 03 — 100 USDC total, top 7 contributors paid out:
//   1st          = $30
//   2nd          = $20
//   3rd → 7th    = $10 each (5 × 10 = 50)
//   total        = 30 + 20 + 50 = 100 USDC
const PRIZE_TIERS = [
  { name: "Champion", ranks: "1st", rangeStart: 1, rangeEnd: 1, usd: 30, pct: 30, winners: 1, Icon: Crown, accent: "amber" as const },
  { name: "Runner-up", ranks: "2nd", rangeStart: 2, rangeEnd: 2, usd: 20, pct: 20, winners: 1, Icon: Medal, accent: "zinc" as const },
  { name: "Top 7", ranks: "3rd - 7th", rangeStart: 3, rangeEnd: 7, usd: 10, pct: 10, winners: 5, Icon: Zap, accent: "brand" as const },
];

const PRIZE_CUTOFF = 7;
const PRIZE_POOL_USD = 100;

function getPrize(rank: number) {
  const tier = PRIZE_TIERS.find((t) => rank >= t.rangeStart && rank <= t.rangeEnd);
  if (!tier) return null;
  return { pct: tier.pct, usd: tier.usd, name: tier.name, accent: tier.accent };
}

function getTierForRank(rank: number) {
  return PRIZE_TIERS.find((t) => rank >= t.rangeStart && rank <= t.rangeEnd) || null;
}

/* ── Prize Pool Tokens ───────────────────────────────────── */
// Season 03 prize pool is paid 100% in USDC. One single line — no
// mixed token bag this season.
const PRIZE_TOKENS = [
  {
    name: "USDC",
    symbol: "USDC",
    amount: "100",
    usd: 100,
    icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.456858.png",
  },
];

const TIER_ACCENT = {
  amber: {
    border: "border-amber-400/30",
    bg: "bg-amber-400/5",
    iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500",
    text: "text-amber-400",
    glow: "shadow-[0_0_16px_rgba(251,191,36,0.15)]",
  },
  zinc: {
    border: "border-zinc-400/30",
    bg: "bg-zinc-400/5",
    iconBg: "bg-gradient-to-br from-zinc-300 to-zinc-400",
    text: "text-zinc-300",
    glow: "shadow-[0_0_16px_rgba(161,161,170,0.15)]",
  },
  brand: {
    border: "border-brand/30",
    bg: "bg-brand/5",
    iconBg: "bg-gradient-to-br from-brand to-teal-500",
    text: "text-brand",
    glow: "shadow-[0_0_16px_rgba(45,212,191,0.15)]",
  },
};

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
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-[0_4px_16px_rgba(251,191,36,0.35)]">
            <Crown className="h-[18px] w-[18px] text-[#2a1a00]" strokeWidth={2.5} />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-zinc-200 to-zinc-400 flex items-center justify-center shadow-[0_4px_16px_rgba(161,161,170,0.28)]">
            <Medal className="h-[18px] w-[18px] text-zinc-900" strokeWidth={2.5} />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_4px_16px_rgba(251,146,60,0.3)]">
            <Medal className="h-[18px] w-[18px] text-[#2a1400]" strokeWidth={2.5} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] flex items-center justify-center">
            <span className="text-text-secondary font-semibold text-[13px] tabular-nums">#{rank}</span>
          </div>
        );
    }
  };

  const getRowStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-brand/[0.06] border-l-[3px] border-l-brand hover:bg-brand/[0.09]";
    const tier = getTierForRank(rank);
    if (!tier) return "hover:bg-bg-secondary/40";
    if (tier.accent === "amber") return "bg-amber-400/[0.03] border-l-[3px] border-l-amber-400 hover:bg-amber-400/[0.06]";
    if (tier.accent === "zinc") return "bg-zinc-300/[0.03] border-l-[3px] border-l-zinc-300 hover:bg-zinc-300/[0.06]";
    return "border-l-[3px] border-l-brand/30 hover:bg-bg-secondary/40";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="reveal-delay-1">
              <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary mb-2">
                {seasonName}
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
                Leaderboard
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[8px] bg-bg-card border border-[var(--card-border)] text-[11px]">
                  <Users className="h-3 w-3 text-text-tertiary" />
                  <span className="font-semibold text-text-primary tabular-nums">{seasonContributors}</span>
                  <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">contributors</span>
                </span>
              </div>
            </div>

            {/* Countdown */}
            <div className="reveal-delay-2">
              {countdown.ended ? (
                <div className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-error/10 border border-error/25">
                  <span className="w-2 h-2 rounded-full bg-error" />
                  <span className="text-[13px] text-error font-medium">Season ended</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)]">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <span className="text-[11px] text-text-tertiary hidden sm:inline uppercase tracking-wider font-medium">ends in</span>
                  <span className="text-[13px] font-semibold tabular-nums text-text-primary">
                    {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-brand">
                    {String(countdown.seconds).padStart(2, "0")}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {/* Prize Pool — Season 03: 100 USDC, top 7 contributors */}
        <div ref={prizesRef} className="reveal mb-8">
          <div className="relative p-5 sm:p-6 rounded-[14px] bg-bg-card border border-[var(--card-border)] overflow-hidden">
            {/* Subtle teal glow behind the headline figure */}
            <div
              aria-hidden
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-[420px] h-[260px] opacity-50 pointer-events-none"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(58,204,184,0.18), transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            <div className="relative">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5 reveal-delay-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[7px] bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <TrendingUp className="h-3 w-3 text-brand" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    Season Prize Pool
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-[6px] bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold tabular-nums">
                  Top {PRIZE_CUTOFF}
                </span>
              </div>

              {/* Hero figure */}
              <div className="text-center mb-6 reveal-delay-2">
                <div className="inline-flex items-center gap-3">
                  {PRIZE_TOKENS[0]?.icon && (
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-secondary ring-1 ring-[var(--card-border)]">
                      <img src={PRIZE_TOKENS[0].icon} alt="USDC" className="w-9 h-9 object-cover" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-[34px] sm:text-[42px] font-semibold text-text-primary tracking-[-0.025em] leading-none tabular-nums">
                      {PRIZE_POOL_USD} <span className="text-text-secondary text-[22px] sm:text-[26px] font-semibold">USDC</span>
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-text-tertiary mt-2">
                  Top {PRIZE_CUTOFF} contributors get rewarded
                </p>
              </div>

              {/* Tier breakdown — 3 cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 reveal-delay-3">
                {PRIZE_TIERS.map((tier) => {
                  const accent = TIER_ACCENT[tier.accent];
                  return (
                    <div
                      key={tier.name}
                      className={cn(
                        "flex flex-col items-center text-center py-3.5 px-2 rounded-[12px] border transition-colors",
                        accent.bg,
                        accent.border
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-medium mb-1.5">
                        {tier.ranks}
                      </span>
                      <span className="text-[22px] sm:text-[26px] font-semibold text-text-primary tabular-nums leading-none">
                        ${tier.usd}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-medium mt-1.5">
                        USDC{tier.winners > 1 ? " · each" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-text-tertiary mt-4 text-center">
                Paid in USDC at the end of the season · No fees from Hashly
              </p>
            </div>
          </div>
        </div>

        {/* User rank */}
        {user && userRank ? (
          <div ref={userRef} className="reveal mb-8">
            <div className="rounded-[14px] overflow-hidden border border-brand/25 bg-brand/[0.03] reveal-delay-1 shadow-[0_0_0_1px_rgba(58,204,184,0.06)]">
              {/* Top bar — rank + prize + points */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-[10px] bg-brand/10 border border-brand/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[15px] font-semibold text-brand tabular-nums">#{userRank}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">Your Rank</p>
                    <p className="text-[13px] font-semibold text-text-primary truncate tabular-nums">{user.walletAddress}</p>
                  </div>
                </div>
                {/* Prize indicator */}
                {(() => {
                  const prize = getPrize(userRank);
                  if (!prize) return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-[10px] bg-bg-secondary/50 border border-[var(--card-border)] flex-shrink-0">
                      <Gift className="h-3.5 w-3.5 text-text-tertiary" />
                      <span className="text-[11px] text-text-tertiary">Top {PRIZE_CUTOFF} wins</span>
                    </div>
                  );
                  return (
                    <div className="inline-flex items-center gap-2.5 px-3 h-9 rounded-[10px] bg-amber-400/8 border border-amber-400/30 flex-shrink-0">
                      <div className="text-center leading-tight">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-amber-400 font-semibold">Your prize</p>
                        <p className="text-[13px] font-semibold tabular-nums text-amber-300">{prize.pct}% · ${prize.usd}</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] flex-shrink-0">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-[15px] font-semibold text-text-primary tabular-nums">{(userData?.totalPoints ?? user.points ?? 0).toLocaleString()}</span>
                </div>
              </div>
              {/* Bottom bar — breakdown inline */}
              {userData && (
                <div className="flex items-center divide-x divide-[var(--border-subtle)] bg-bg-secondary/30 border-t border-[var(--border-subtle)] px-1">
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Target className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    <span className="text-[11px] text-text-secondary">Mission</span>
                    <span className="text-[12px] font-semibold text-text-primary ml-auto tabular-nums">{userData.missionPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Award className="h-3.5 w-3.5 text-accent-coral flex-shrink-0" />
                    <span className="text-[11px] text-text-secondary">Badge</span>
                    <span className="text-[12px] font-semibold text-text-primary ml-auto tabular-nums">{userData.badgePoints.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 px-4 py-2.5">
                    <Users className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span className="text-[11px] text-text-secondary">Referral</span>
                    <span className="text-[12px] font-semibold text-text-primary ml-auto tabular-nums">{(userData.referralPoints || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Leaderboard Table */}
        <div ref={tableRef} className="reveal">
          <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
            <div className="px-5 sm:px-6 h-14 border-b border-[var(--border-subtle)] flex items-center justify-between reveal-delay-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[8px] bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Trophy className="h-3.5 w-3.5 text-brand" />
                </div>
                <h2 className="text-[14px] font-semibold text-text-primary tracking-tight">Top 50</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <Users className="h-3 w-3" />
                <span className="tabular-nums font-medium">{seasonContributors.toLocaleString()}</span>
                <span className="hidden sm:inline uppercase tracking-wider text-[10px] font-medium">registered</span>
              </div>
            </div>

            <div className="reveal-delay-2">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-16 bg-bg-secondary/40 border border-[var(--border-subtle)] animate-pulse rounded-[10px]" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-bg-secondary border border-[var(--card-border)] flex items-center justify-center">
                    <Trophy className="h-7 w-7 text-text-tertiary" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-text-primary mb-1">No rankings yet</h3>
                  <p className="text-text-secondary text-sm">Be the first to earn points.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = user?.walletAddress === entry.walletAddress;
                    const prize = getPrize(entry.rank);

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
                            <span className="font-semibold text-text-primary truncate text-[14px] sm:text-[15px] max-w-[120px] sm:max-w-none tracking-tight">
                              {entry.alias || `${entry.walletAddress.slice(0, 8)}…${entry.walletAddress.slice(-4)}`}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="brand" size="sm">You</Badge>
                            )}
                            {prize && (
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 h-[22px] rounded-[6px] text-[11px] font-semibold tabular-nums border",
                                prize.accent === "amber" ? "bg-amber-400/12 text-amber-300 border-amber-400/30" :
                                prize.accent === "zinc" ? "bg-zinc-400/12 text-zinc-300 border-zinc-400/30" :
                                "bg-brand/12 text-brand border-brand/30"
                              )}>
                                <Gift className="h-3 w-3" />
                                {prize.pct}% · ${prize.usd}
                              </span>
                            )}
                          </div>
                          {/* Mobile breakdown */}
                          <div className="flex items-center gap-2.5 mt-1 sm:hidden">
                            <span className="text-[10px] text-text-tertiary flex items-center gap-0.5 tabular-nums">
                              <Target className="h-2.5 w-2.5 text-brand" />
                              {entry.missionPoints.toLocaleString()}
                            </span>
                            {entry.badgeCount > 0 && (
                              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5 tabular-nums">
                                <Award className="h-2.5 w-2.5 text-accent-coral" />
                                {entry.badgePoints.toLocaleString()}
                              </span>
                            )}
                            {entry.referralPoints > 0 && (
                              <span className="text-[10px] text-text-tertiary flex items-center gap-0.5 tabular-nums">
                                <Users className="h-2.5 w-2.5 text-success" />
                                {entry.referralPoints.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop breakdown */}
                        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                          <div className="inline-flex items-center gap-1 px-2 h-6 rounded-[6px] bg-bg-secondary/60 border border-[var(--border-subtle)]">
                            <Target className="h-3 w-3 text-brand" />
                            <span className="text-[11px] text-text-secondary tabular-nums">{entry.missionPoints.toLocaleString()}</span>
                          </div>
                          {entry.badgeCount > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 h-6 rounded-[6px] bg-bg-secondary/60 border border-[var(--border-subtle)]">
                              <Award className="h-3 w-3 text-accent-coral" />
                              <span className="text-[11px] text-text-secondary tabular-nums">{entry.badgePoints.toLocaleString()}</span>
                            </div>
                          )}
                          {entry.referralPoints > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 h-6 rounded-[6px] bg-bg-secondary/60 border border-[var(--border-subtle)]">
                              <Users className="h-3 w-3 text-success" />
                              <span className="text-[11px] text-text-secondary tabular-nums">{entry.referralPoints.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Total Points */}
                        <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] bg-bg-secondary border border-[var(--card-border)] flex-shrink-0">
                          <Zap className="h-4 w-4 text-amber-400" />
                          <span className="font-semibold text-text-primary text-[14px] tabular-nums">{entry.totalPoints.toLocaleString()}</span>
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
