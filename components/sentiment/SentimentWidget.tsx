"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Loader2,
  Users,
  Shield,
  Layers,
  Globe,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSentimentLabel,
} from "@/lib/hcs";

interface SentimentWidgetData {
  today: {
    scores: {
      nft: number | null;
      network: number | null;
      hbar: number | null;
      global: number | null;
      smoothedGlobal: number | null;
    };
    totalVoters: number;
  };
}

const getScoreColorClass = (score: number | null) => {
  if (score === null) return "text-text-secondary";
  if (score <= 20) return "text-red-500";
  if (score <= 40) return "text-orange-500";
  if (score <= 60) return "text-yellow-500";
  if (score <= 80) return "text-lime-500";
  return "text-green-500";
};

const getScoreBorderColor = (score: number | null) => {
  if (score === null) return "border-l-gray-500";
  if (score <= 20) return "border-l-red-500";
  if (score <= 40) return "border-l-orange-500";
  if (score <= 60) return "border-l-yellow-500";
  if (score <= 80) return "border-l-lime-500";
  return "border-l-green-500";
};

const CATEGORIES = [
  { id: "nft", label: "NFT", icon: Layers, color: "text-purple-400" },
  { id: "network", label: "Network", icon: Globe, color: "text-cyan-400" },
  { id: "hbar", label: "HBAR", icon: Coins, color: "text-amber-400" },
] as const;

export function SentimentWidget() {
  const [data, setData] = React.useState<SentimentWidgetData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/sentiment?days=1");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch sentiment:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="border-l-4 border-l-accent-primary/50 rounded-r-md bg-bg-card/80 p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-40 bg-bg-secondary rounded" />
          <div className="h-4 w-16 bg-bg-secondary rounded" />
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
        </div>
      </div>
    );
  }

  const globalScore = data?.today.scores.smoothedGlobal ?? data?.today.scores.global ?? null;
  const hasData = globalScore !== null;

  return (
    <Link href="/sentiment" className="block group">
      <div className={cn(
        "border-l-4 rounded-r-md bg-bg-card/80 transition-all duration-200",
        "hover:bg-bg-card hover:shadow-lg",
        getScoreBorderColor(globalScore)
      )}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-primary" />
              <span className="text-sm font-bold text-text-primary">Hedera Sentiment Index</span>
              {/* On-chain badge */}
              <div className="skew-tag px-1.5 py-0.5 bg-green-600 text-white hidden sm:block">
                <span className="flex items-center gap-1 text-[8px] font-bold">
                  <Shield className="h-2 w-2" />
                  HCS
                </span>
              </div>
            </div>
            <span className="text-xs text-accent-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Vote <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* Content */}
          <div className="flex items-center gap-4">
            {/* Mini Speedometer */}
            <div className="flex-shrink-0 w-24 sm:w-28">
              <svg viewBox="0 0 100 65" className="w-full">
                <defs>
                  <linearGradient id="miniGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="25%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="75%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <filter id="miniGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Background arc */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-bg-secondary"
                />

                {/* Colored arc (faded) */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="url(#miniGaugeGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.25"
                />

                {/* Active arc */}
                {hasData && (
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="url(#miniGaugeGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${((globalScore ?? 0) / 100) * 125.6} 125.6`}
                    filter="url(#miniGlow)"
                    className="transition-all duration-500"
                  />
                )}

                {/* Needle - dark in light mode, white in dark mode */}
                {hasData && (
                  <g
                    style={{
                      transform: `rotate(${((globalScore ?? 50) / 100) * 180 - 90}deg)`,
                      transformOrigin: "50px 50px",
                      transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <path d="M 50 50 L 48.5 48 L 50 20 L 51.5 48 Z" className="fill-gray-800 dark:fill-white" filter="url(#miniGlow)" />
                    <circle cx="50" cy="50" r="3" className="fill-gray-800 dark:fill-white" />
                    <circle cx="50" cy="50" r="1.5" className="fill-bg-card" />
                  </g>
                )}

                {/* Score display below needle */}
                <text
                  x="50"
                  y="62"
                  textAnchor="middle"
                  className="fill-text-primary font-bold"
                  style={{ fontSize: "11px" }}
                >
                  {hasData ? Math.round(globalScore!) : "—"}
                </text>
              </svg>
              <div className="text-center -mt-2">
                <span className={cn(
                  "text-[10px] font-semibold",
                  getScoreColorClass(globalScore)
                )}>
                  {getSentimentLabel(globalScore)}
                </span>
              </div>
            </div>

            {/* Category bars */}
            {hasData && data && (
              <div className="flex-1 space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const score = data.today.scores[cat.id] ?? 50;
                  const Icon = cat.icon;

                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-14">
                        <Icon className={cn("h-3 w-3", cat.color)} />
                        <span className="text-[9px] text-text-secondary font-medium">{cat.label}</span>
                      </div>
                      <div className="flex-1 h-1 bg-bg-secondary rounded-sm overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-sm transition-all duration-500",
                            score <= 20 ? "bg-red-500" :
                            score <= 40 ? "bg-orange-500" :
                            score <= 60 ? "bg-yellow-500" :
                            score <= 80 ? "bg-lime-500" :
                            "bg-green-500"
                          )}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[9px] font-mono font-medium w-5 text-right",
                        score <= 20 ? "text-red-500" :
                        score <= 40 ? "text-orange-500" :
                        score <= 60 ? "text-yellow-500" :
                        score <= 80 ? "text-lime-500" :
                        "text-green-500"
                      )}>
                        {Math.round(score)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed border-border/50">
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <Users className="h-3 w-3" />
              <span className="font-medium">{data?.today.totalVoters || 0}</span>
              <span>voters today</span>
            </div>
            {!hasData && (
              <span className="text-[10px] text-accent-primary font-medium">Be the first to vote!</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
