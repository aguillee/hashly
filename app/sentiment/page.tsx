"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Clock,
  Users,
  Activity,
  Layers,
  Globe,
  Coins,
  ExternalLink,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/store";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import {
  getSentimentLabel,
  getSentimentColor,
  formatTimeRemaining,
  createSentimentVoteMessage,
  SENTIMENT_TOPIC_ID,
} from "@/lib/hcs";
import { TopicMessageSubmitTransaction, TopicId } from "@hiero-ledger/sdk";

interface SentimentData {
  today: {
    date: string;
    scores: {
      nft: number | null;
      network: number | null;
      hbar: number | null;
      global: number | null;
      smoothedGlobal: number | null;
    };
    votes: {
      nft: { bullish: number; bearish: number };
      network: { bullish: number; bearish: number };
      hbar: { bullish: number; bearish: number };
    };
    totalVoters: number;
  };
  userVotes: Record<string, string>;
  timeUntilReset: number;
  history: Array<{
    date: string;
    globalScore: number | null;
    nftScore: number | null;
    networkScore: number | null;
    hbarScore: number | null;
    totalVoters: number;
  }>;
}

type Category = "nft" | "network" | "hbar";
type VoteType = "bullish" | "bearish";

const CATEGORIES: { id: Category; label: string; icon: React.ElementType; description: string; borderColor: string; badgeColor: string }[] = [
  {
    id: "nft",
    label: "NFTs",
    icon: Layers,
    description: "Hedera NFT ecosystem",
    borderColor: "border-l-purple-500",
    badgeColor: "bg-purple-500",
  },
  {
    id: "network",
    label: "Network",
    icon: Globe,
    description: "Hedera network outlook",
    borderColor: "border-l-cyan-500",
    badgeColor: "bg-cyan-500",
  },
  {
    id: "hbar",
    label: "HBAR",
    icon: Coins,
    description: "HBAR price sentiment",
    borderColor: "border-l-amber-500",
    badgeColor: "bg-amber-500",
  },
];

export default function SentimentPage() {
  const [data, setData] = React.useState<SentimentData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [votingCategory, setVotingCategory] = React.useState<Category | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<string>("");

  const { isConnected, walletAddress, accountId } = useWalletStore();
  const { dAppConnector } = useWallet();
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (walletAddress) params.set("wallet", walletAddress);
      params.set("days", "30");

      const response = await fetch(`/api/sentiment?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch sentiment:", error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (!data) return;

    const updateTimer = () => {
      // Calculate time until next UTC midnight
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      setTimeRemaining(formatTimeRemaining(ms));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [data]);

  const handleVote = async (category: Category, vote: VoteType) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to vote",
      });
      return;
    }

    if (data?.userVotes[category]) {
      toast({
        title: "Already Voted",
        description: `You already voted ${data.userVotes[category]} for ${category} today`,
        variant: "error",
      });
      return;
    }

    if (!dAppConnector) {
      toast({
        title: "Wallet Not Ready",
        description: "Please reconnect your wallet",
        variant: "error",
      });
      return;
    }

    setVotingCategory(category);

    try {
      const signers = dAppConnector.signers;
      const signer = signers.find(
        (s) => s.getAccountId().toString() === accountId
      );

      if (!signer) {
        throw new Error("No signer found for connected account");
      }

      const today = new Date().toISOString().split("T")[0];
      const voteMessage = createSentimentVoteMessage(
        walletAddress,
        category,
        vote,
        today
      );

      const topicId = TopicId.fromString(SENTIMENT_TOPIC_ID);
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(JSON.stringify(voteMessage));

      const txResponse = await signer.call(transaction);
      const hcsTransactionId = txResponse.transactionId.toString();

      toast({
        title: "Vote Submitted On-Chain!",
        description: "Recording in database...",
      });

      const response = await fetch("/api/sentiment/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          vote,
          hcsTransactionId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Vote Recorded!",
          description: `You voted ${vote} for ${category.toUpperCase()}`,
        });
        fetchData();
      } else {
        toast({
          title: "Database Error",
          description: result.error || "Vote is on-chain but failed to save locally",
          variant: "error",
        });
      }
    } catch (error: any) {
      console.error("Vote error:", error);

      if (error?.message?.includes("User rejected") || error?.message?.includes("cancelled")) {
        toast({
          title: "Vote Cancelled",
          description: "You cancelled the transaction",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to submit vote",
          variant: "error",
        });
      }
    } finally {
      setVotingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-text-secondary text-sm">Loading sentiment data...</p>
        </div>
      </div>
    );
  }

  const globalScore = data?.today.scores.smoothedGlobal ?? data?.today.scores.global ?? null;

  // Calculate total votes from today.votes (already includes 3 days)
  const totalVotes3Days = data?.today.votes
    ? Object.values(data.today.votes).reduce((sum, cat) => sum + cat.bullish + cat.bearish, 0)
    : 0;

  // Get score color class for the main display
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

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent-primary/10 border-2 border-accent-primary/50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                Hedera Sentiment Index
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                Community sentiment on HCS
              </p>
            </div>
          </div>
          {/* On-chain badge */}
          <div className="skew-tag px-2.5 py-1 bg-green-600 text-white">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold">
              <Shield className="h-3 w-3" />
              ON-CHAIN
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Main Score Card */}
        <div className={cn(
          "border-l-4 rounded-r-md bg-bg-card/80 overflow-hidden",
          getScoreBorderColor(globalScore)
        )}>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Score section */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-text-secondary" />
                  <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Global Score</span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className={cn(
                    "text-5xl sm:text-6xl font-bold tabular-nums",
                    getScoreColorClass(globalScore)
                  )}>
                    {globalScore !== null ? Math.round(globalScore) : "—"}
                  </span>
                  <span className={cn(
                    "text-lg sm:text-xl font-semibold",
                    getScoreColorClass(globalScore)
                  )}>
                    {getSentimentLabel(globalScore)}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 pt-3 border-t border-dashed border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="font-mono font-medium">{totalVotes3Days}</span>
                    <span>votes</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock className="h-3.5 w-3.5" />
                    <span>vote again in</span>
                    <span className="font-mono font-medium">{timeRemaining}</span>
                  </div>
                </div>
              </div>

              {/* Speedometer visualization */}
              <div className="w-48 sm:w-56 flex-shrink-0">
                <div className="relative">
                  <svg viewBox="0 0 200 130" className="w-full">
                    <defs>
                      {/* Gradient for the arc */}
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="25%" stopColor="#f97316" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="75%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      {/* Glow filter */}
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background arc (track) */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="text-bg-secondary"
                    />

                    {/* Colored arc */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.3"
                    />

                    {/* Active arc based on score */}
                    {globalScore !== null && (
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(globalScore / 100) * 251.2} 251.2`}
                        filter="url(#glow)"
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Tick marks */}
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const angle = (tick / 100) * 180 - 180;
                      const rad = (angle * Math.PI) / 180;
                      const x1 = 100 + 68 * Math.cos(rad);
                      const y1 = 100 + 68 * Math.sin(rad);
                      const x2 = 100 + 60 * Math.cos(rad);
                      const y2 = 100 + 60 * Math.sin(rad);
                      return (
                        <line
                          key={tick}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="text-text-secondary/50"
                        />
                      );
                    })}

                    {/* Needle - dark in light mode, white in dark mode */}
                    {globalScore !== null && (
                      <g
                        style={{
                          transform: `rotate(${(globalScore / 100) * 180 - 90}deg)`,
                          transformOrigin: "100px 100px",
                          transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        {/* Needle body */}
                        <path
                          d="M 100 100 L 97 96 L 100 35 L 103 96 Z"
                          className="fill-gray-800 dark:fill-white"
                          filter="url(#glow)"
                        />
                        {/* Needle center circle */}
                        <circle cx="100" cy="100" r="6" className="fill-gray-800 dark:fill-white" />
                        <circle cx="100" cy="100" r="3" className="fill-bg-card" />
                      </g>
                    )}

                    {/* Scale labels - positioned outside the arc */}
                    <text x="8" y="118" className="text-[11px] fill-text-secondary font-bold">0</text>
                    <text x="93" y="12" className="text-[11px] fill-text-secondary font-bold">50</text>
                    <text x="178" y="118" className="text-[11px] fill-text-secondary font-bold">100</text>
                  </svg>

                  {/* Labels below */}
                  <div className="flex justify-between px-1 -mt-2">
                    <span className="text-[10px] font-bold text-red-500">FEAR</span>
                    <span className="text-[10px] font-bold text-green-500">GREED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {CATEGORIES.map((cat) => {
            const score = data?.today.scores[cat.id] ?? null;
            const votes = data?.today.votes[cat.id] || { bullish: 0, bearish: 0 };
            const userVote = data?.userVotes[cat.id];
            const isVoting = votingCategory === cat.id;
            const Icon = cat.icon;
            const totalCatVotes = votes.bullish + votes.bearish;
            const bullishPercent = totalCatVotes > 0 ? (votes.bullish / totalCatVotes) * 100 : 50;

            return (
              <div
                key={cat.id}
                className={cn(
                  "border-l-4 rounded-r-md bg-bg-card/80 overflow-hidden transition-all",
                  cat.borderColor,
                  userVote && "ring-1 ring-accent-primary/30"
                )}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center",
                        cat.badgeColor
                      )}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-text-primary">{cat.label}</h3>
                        <p className="text-[10px] text-text-secondary">{cat.description}</p>
                      </div>
                    </div>
                    {userVote && (
                      <div className="skew-tag px-1.5 py-0.5 bg-accent-primary text-white">
                        <span className="text-[9px] font-bold flex items-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5" />
                          VOTED
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className={cn("text-3xl font-bold tabular-nums", getScoreColorClass(score))}>
                        {score !== null ? Math.round(score) : "—"}
                      </div>
                      <div className={cn("text-xs font-medium", getScoreColorClass(score))}>
                        {getSentimentLabel(score)}
                      </div>
                    </div>
                  </div>

                  {/* Vote distribution */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                        {votes.bullish}
                      </span>
                      <span className="flex items-center gap-0.5">
                        {votes.bearish}
                        <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-secondary rounded-sm overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${bullishPercent}%` }}
                      />
                      <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${100 - bullishPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Vote buttons or status */}
                  {userVote ? (
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 py-2 rounded-sm text-xs font-medium",
                      userVote === "bullish"
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {userVote === "bullish" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>Voted {userVote}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVote(cat.id, "bullish")}
                        disabled={isVoting || !isConnected}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-2 rounded-sm text-xs font-medium transition-all",
                          "bg-green-500/10 text-green-500 border border-green-500/20",
                          "hover:bg-green-500/20 hover:border-green-500/40",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {isVoting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            Bull
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleVote(cat.id, "bearish")}
                        disabled={isVoting || !isConnected}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-2 rounded-sm text-xs font-medium transition-all",
                          "bg-red-500/10 text-red-500 border border-red-500/20",
                          "hover:bg-red-500/20 hover:border-red-500/40",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {isVoting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            Bear
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Historical Chart */}
        {data && data.history.length > 1 && (
          <div className="border-l-4 border-l-accent-primary rounded-r-md bg-bg-card/80 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-accent-primary" />
                30-Day History
              </h3>
              <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-red-500" /> Fear
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-yellow-500" /> Neutral
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-green-500" /> Greed
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="relative">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-[9px] text-text-secondary">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>

              {/* Bars container */}
              <div className="ml-7">
                <div className="flex items-end gap-px h-32 border-l border-b border-border/30">
                  {data.history.slice(0, 30).reverse().map((day, i) => {
                    const score = day.globalScore ?? 50;
                    const isToday = i === data.history.length - 1;

                    const getBarColor = (s: number) => {
                      if (s <= 20) return "bg-red-500";
                      if (s <= 40) return "bg-orange-500";
                      if (s <= 60) return "bg-yellow-500";
                      if (s <= 80) return "bg-lime-500";
                      return "bg-green-500";
                    };

                    return (
                      <div
                        key={day.date}
                        className="flex-1 min-w-[4px] group relative"
                        style={{ height: "100%" }}
                      >
                        <div
                          className={cn(
                            "absolute bottom-0 w-full transition-all duration-300 rounded-t-sm",
                            getBarColor(score),
                            isToday && "ring-1 ring-white ring-offset-1 ring-offset-bg-card"
                          )}
                          style={{ height: `${score}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-bg-primary border border-border rounded px-2 py-1 shadow-lg whitespace-nowrap">
                            <div className="text-[9px] text-text-secondary font-mono">{day.date}</div>
                            <div className="text-sm font-bold text-text-primary">{Math.round(score)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels */}
                <div className="flex justify-between text-[9px] text-text-secondary mt-1">
                  <span>30d ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="border-l-4 border-l-accent-primary/50 rounded-r-md bg-bg-card/50 p-4">
            <h4 className="font-bold text-sm text-text-primary mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-primary" />
              How it works
            </h4>
            <ul className="space-y-1.5 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent-primary" />
                1 wallet = 1 vote per category per day
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent-primary" />
                Votes reset at 00:00 UTC daily
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent-primary" />
                3-day smoothing: Today 50% • Yesterday 30% • 2d ago 20%
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent-primary" />
                Category weights: Network 50% • HBAR 30% • NFT 20%
              </li>
            </ul>
          </div>

          <div className="border-l-4 border-l-green-500/50 rounded-r-md bg-bg-card/50 p-4">
            <h4 className="font-bold text-sm text-text-primary mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              On-Chain Verified
            </h4>
            <p className="text-xs text-text-secondary mb-3">
              All votes are permanently recorded on Hedera Consensus Service for transparency.
            </p>
            <a
              href={`https://hashscan.io/mainnet/topic/${SENTIMENT_TOPIC_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
            >
              <Activity className="h-3 w-3" />
              View on HashScan
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
