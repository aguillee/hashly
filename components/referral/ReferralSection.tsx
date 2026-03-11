"use client";

import * as React from "react";
import {
  Users,
  Copy,
  Check,
  Zap,
  Lock,
  Clock,
  ArrowRight,
  Loader2,
  Gift,
} from "lucide-react";
import { useReferralStats, mutate } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface ReferralStatsData {
  referralCode: string | null;
  referredBy: {
    walletAddress: string;
    alias: string | null;
    referralCode: string | null;
  } | null;
  canChangeReferral: boolean;
  lockExpiresAt: string | null;
  daysUntilUnlock: number | null;
  referees: Array<{
    walletAddress: string;
    alias: string | null;
    theirTotalPoints: number;
    contributedPoints: number;
    bonusPaid: boolean;
    joinedAt: string;
  }>;
  totalReferralPoints: number;
  totalReferees: number;
}

function formatWallet(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ReferralSection() {
  const { data, isLoading } = useReferralStats() as { data: ReferralStatsData | undefined; isLoading: boolean };
  const [copied, setCopied] = React.useState(false);
  const [codeInput, setCodeInput] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [applyResult, setApplyResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const copyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyCode = async () => {
    if (!codeInput.trim()) return;
    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim().toUpperCase() }),
      });

      const result = await res.json();

      if (res.ok) {
        setApplyResult({
          success: true,
          message: `+${result.pointsEarned} points! Referred by ${result.referrerAlias || "a user"}`,
        });
        setCodeInput("");
        // Refresh stats and user data
        mutate("/api/referral/stats");
        mutate("/api/auth/me");
      } else {
        setApplyResult({
          success: false,
          message: result.error || "Failed to apply code",
        });
      }
    } catch {
      setApplyResult({
        success: false,
        message: "Something went wrong",
      });
    } finally {
      setApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-brand" />
          <h3 className="font-semibold text-text-primary">Referrals</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand" />
          <h3 className="font-semibold text-text-primary">Referrals</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Zap className="h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-500">
            {data.totalReferralPoints}
          </span>
          <span className="text-text-secondary text-xs">pts</span>
        </div>
      </div>

      {/* Your referral code */}
      <div className="space-y-2">
        <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">
          Your Referral Code
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-secondary rounded-md px-3 py-2.5 text-lg tracking-widest text-brand text-center select-all">
            {data.referralCode || "—"}
          </div>
          <button
            onClick={copyCode}
            className="p-2.5 rounded-md bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-text-secondary">
          Share this code. You earn <strong className="text-green-500">50 pts</strong> when a referred user reaches 50 mission points, plus <strong className="text-green-500">5%</strong> of all their points.
        </p>
      </div>

      {/* Enter referral code */}
      <div className="space-y-2">
        <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">
          Enter a Referral Code
        </p>

        {data.referredBy ? (
          <div className="flex items-center gap-2 bg-bg-secondary rounded-md px-3 py-2.5 text-sm">
            <Gift className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-text-secondary">Referred by</span>
            <span className="font-medium text-text-primary">
              {data.referredBy.alias || formatWallet(data.referredBy.walletAddress)}
            </span>
            {!data.canChangeReferral && data.daysUntilUnlock && (
              <span className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                <Lock className="h-3 w-3" />
                {data.daysUntilUnlock}d
              </span>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) =>
                setCodeInput(e.target.value.toUpperCase().slice(0, 8))
              }
              placeholder="ENTER CODE"
              className="flex-1 bg-bg-secondary border border-border rounded-md px-3 py-2 text-sm tracking-wider text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              maxLength={8}
              disabled={applying}
            />
            <button
              onClick={applyCode}
              disabled={applying || codeInput.length !== 8}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                codeInput.length === 8
                  ? "bg-brand text-white hover:bg-brand/90"
                  : "bg-bg-secondary text-text-secondary cursor-not-allowed"
              )}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Apply
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {applyResult && (
          <p
            className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              applyResult.success
                ? "text-green-400 bg-green-500/10"
                : "text-red-400 bg-red-500/10"
            )}
          >
            {applyResult.message}
          </p>
        )}

        {!data.referredBy && (
          <p className="text-[11px] text-text-secondary">
            You get <strong className="text-green-500">+50 pts</strong> instantly when you enter a valid code. Locked for 60 days after applying.
          </p>
        )}
      </div>

      {/* Referees list */}
      {data.referees.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">
            Your Referees ({data.totalReferees})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.referees.map((referee) => (
              <div
                key={referee.walletAddress}
                className="flex items-center justify-between bg-bg-secondary rounded-md px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <Users className="h-3 w-3 text-brand" />
                  </div>
                  <span className="font-medium text-text-primary truncate">
                    {referee.alias || formatWallet(referee.walletAddress)}
                  </span>
                  {!referee.bonusPaid && (
                    <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                  <span className="text-text-secondary">
                    {referee.theirTotalPoints} pts
                  </span>
                  <span className="font-medium text-green-500">
                    +{referee.contributedPoints}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
