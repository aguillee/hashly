"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Zap,
  Flame,
  Trophy,
  Calendar,
  Vote,
  TrendingUp,
  Clock,
  Award,
  Loader2,
  Copy,
  Check,
  Shield,
  ExternalLink,
  Pencil,
  X,
  Save,
  Mic2,
  Eye,
  Star,
  ThumbsUp,
} from "lucide-react";
import { HostedBadges } from "@/components/badges/HostedBadges";
import { ReferralSection } from "@/components/referral/ReferralSection";
import { PortfolioDashboard } from "@/components/profile/PortfolioDashboard";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

interface PointHistoryItem {
  id: string;
  points: number;
  actionType: string;
  description: string | null;
  createdAt: string;
}

interface CreatedEvent {
  id: string;
  title: string;
  event_type: "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";
  status: "UPCOMING" | "LIVE";
  isApproved: boolean;
  rejectedAt: string | null;
  mintDate: string | null;
  votesUp: number;
  votesDown: number;
  imageUrl: string | null;
}

interface ProfileStats {
  totalVotes: number;
  totalEvents: number;
  approvedEvents: number;
  rank: number;
  totalUsers: number;
  pointHistory: PointHistoryItem[];
  createdEvents: CreatedEvent[];
}

interface NFTData {
  nfts: {
    dragons: { serialNumber: number; tokenId: string }[];
    santuario: { serialNumber: number; tokenId: string }[];
  };
  stats: {
    totalDragons: number;
    hasSantuario: boolean;
    potentialVotes: {
      dragonVotes: number;
      santuarioVotes: number;
      total: number;
    };
  };
  benefits: {
    canAutoApproveEvents: boolean;
    extraVotesPerProject: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [stats, setStats] = React.useState<ProfileStats | null>(null);
  const [nftData, setNftData] = React.useState<NFTData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingNFTs, setLoadingNFTs] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [editingAlias, setEditingAlias] = React.useState(false);
  const [aliasInput, setAliasInput] = React.useState("");
  const [savingAlias, setSavingAlias] = React.useState(false);
  const { setUser } = useWalletStore();

  const headerRef = useReveal();
  const portfolioRef = useReveal();
  const nftRef = useReveal();
  const referralRef = useReveal();
  const hostedRef = useReveal();
  const eventsRef = useReveal();
  const activityRef = useReveal();

  React.useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  React.useEffect(() => {
    if (isConnected && user) {
      loadProfileStats();
      loadNFTs();
    }
  }, [isConnected, user]);

  async function loadProfileStats() {
    try {
      setLoading(true);
      const response = await fetch("/api/users/profile");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNFTs() {
    try {
      setLoadingNFTs(true);
      const response = await fetch("/api/users/nfts");
      const data = await response.json();
      if (response.ok) {
        setNftData(data);
      } else {
        console.error("Failed to load NFTs:", data.error);
      }
    } catch (error) {
      console.error("Failed to load NFTs:", error);
    } finally {
      setLoadingNFTs(false);
    }
  }

  const copyAddress = () => {
    if (user) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startEditAlias = () => {
    setAliasInput(user?.alias || "");
    setEditingAlias(true);
  };

  const saveAlias = async () => {
    setSavingAlias(true);
    try {
      const response = await fetch("/api/users/alias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: aliasInput }),
      });

      if (response.ok) {
        const data = await response.json();
        if (user) {
          setUser({ ...user, alias: data.alias });
        }
        setEditingAlias(false);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update alias");
      }
    } catch {
      alert("Failed to update alias");
    } finally {
      setSavingAlias(false);
    }
  };

  if (!isConnected || !user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "VOTE":
        return <Vote className="h-4 w-4" />;
      case "DAILY_CHECKIN":
        return <Calendar className="h-4 w-4" />;
      case "EVENT_APPROVED":
        return <Award className="h-4 w-4" />;
      case "MISSION_COMPLETE":
        return <Trophy className="h-4 w-4" />;
      case "STREAK_BONUS":
        return <Flame className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-delay-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
              Your Account
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1] mb-4">
              Profile
            </h1>
          </div>

          {/* Wallet + Alias + Stats — single row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 reveal-delay-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copyAddress}
                className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors text-sm active:scale-[0.97]"
              >
                <span className="text-text-secondary text-xs sm:text-sm tabular-nums">
                  {user.walletAddress}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-text-tertiary" />
                )}
              </button>
              {editingAlias ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="Enter alias…"
                    maxLength={20}
                    className="px-3 h-9 rounded-[10px] bg-bg-card border border-brand/40 text-text-primary text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(58,204,184,0.18)] w-36 transition-shadow"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveAlias();
                      if (e.key === "Escape") setEditingAlias(false);
                    }}
                  />
                  <button
                    onClick={saveAlias}
                    disabled={savingAlias}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] bg-success/10 text-success hover:bg-success/20 transition-colors active:scale-[0.95]"
                    aria-label="Save alias"
                  >
                    {savingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditingAlias(false)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] bg-error/10 text-error hover:bg-error/20 transition-colors active:scale-[0.95]"
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditAlias}
                  className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors text-sm active:scale-[0.97]"
                >
                  <span className="text-text-secondary text-xs sm:text-sm">
                    {user.alias ? (
                      <>Alias: <span className="text-text-primary font-medium">{user.alias}</span></>
                    ) : (
                      "Set alias"
                    )}
                  </span>
                  <Pencil className="h-3 w-3 text-text-tertiary" />
                </button>
              )}
              {/* Points pill — brand fill */}
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-brand/8 border border-brand/20">
                <Zap className="h-4 w-4 text-brand" />
                <span className="text-base font-semibold text-text-primary tabular-nums">
                  {(user.totalPoints ?? user.points ?? 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">pts</span>
              </div>
              {/* Streak pill — warm amber fill */}
              <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] border border-warning/25 bg-warning/8 text-sm">
                <Flame className="h-3.5 w-3.5 text-warning" />
                <span className="font-semibold text-text-primary tabular-nums">{user.loginStreak}d</span>
                <span className="text-text-tertiary text-[10px] uppercase tracking-wider font-medium">streak</span>
              </div>
            </div>

            {/* Stats inline */}
            {stats && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Vote className="h-3.5 w-3.5 text-brand" />
                  <span className="text-sm font-bold text-text-primary font-mono tabular-nums">{stats.totalVotes}</span>
                  <span className="text-[10px] text-text-tertiary">votes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-sm font-bold text-text-primary font-mono tabular-nums">{stats.approvedEvents}</span>
                  <span className="text-[10px] text-text-tertiary">events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-sm font-bold text-text-primary font-mono tabular-nums">#{stats.rank}</span>
                  <span className="text-[10px] text-text-tertiary">rank</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-sm font-bold text-text-primary font-mono tabular-nums">Top {Math.round((stats.rank / stats.totalUsers) * 100)}%</span>
                  <span className="text-[10px] text-text-tertiary">of {stats.totalUsers}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        {/* Wallet Portfolio Dashboard */}
        <div ref={portfolioRef} className="reveal mb-6 reveal-delay-1">
          <PortfolioDashboard walletAddress={user.walletAddress} />
        </div>

        {/* NFTs Section (Voting Power) */}
        <div ref={nftRef} className="reveal mb-5">
          <div className="flex items-center gap-2 mb-3 reveal-delay-1">
            <Shield className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-bold text-text-primary">Detected NFTs</h2>
          </div>

          {loadingNFTs ? (
            <div className="p-8 rounded-[12px] bg-bg-card border border-[var(--card-border)] text-center reveal-delay-2">
              <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
              <p className="text-text-secondary text-sm">Loading NFTs...</p>
            </div>
          ) : nftData ? (
            <div className="reveal-delay-2">
              <div className="grid md:grid-cols-2 gap-3">
                {/* Dragons */}
                <div className="p-4 rounded-[12px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-text-primary">Santuario Hedera (Dragons)</h3>
                    <a
                      href="https://sentx.io/nft-marketplace/santuario-hedera"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-tertiary hover:text-brand transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {nftData.stats.totalDragons > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" size="sm">{nftData.stats.totalDragons} Dragons</Badge>
                        <Badge variant="success" size="sm">+{nftData.stats.potentialVotes.dragonVotes} votes/project</Badge>
                      </div>
                      <div className="text-xs text-text-tertiary font-mono">
                        Serials: {nftData.nfts.dragons.slice(0, 10).map(d => `#${d.serialNumber}`).join(", ")}
                        {nftData.nfts.dragons.length > 10 && ` +${nftData.nfts.dragons.length - 10} more`}
                      </div>
                    </>
                  ) : (
                    <p className="text-text-tertiary text-sm">No dragons detected</p>
                  )}
                </div>

                {/* El Santuario */}
                <div className="p-4 rounded-[12px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-text-primary">El Santuario</h3>
                    <a
                      href="https://sentx.io/nft-marketplace/el-santuario"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-tertiary hover:text-brand transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {nftData.stats.hasSantuario ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="default" size="sm">Holder</Badge>
                        <Badge variant="success" size="sm">+{nftData.stats.potentialVotes.santuarioVotes} votes/project</Badge>
                        <Badge variant="purple" size="sm">Auto-approve</Badge>
                      </div>
                      <div className="text-xs text-text-tertiary font-mono">
                        Serial: #{nftData.nfts.santuario[0]?.serialNumber}
                      </div>
                    </>
                  ) : (
                    <p className="text-text-tertiary text-sm">No El Santuario NFT detected</p>
                  )}
                </div>
              </div>

              {/* Benefits Summary */}
              {nftData.benefits.extraVotesPerProject > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-brand/5 border border-brand/10">
                  <p className="text-sm">
                    <span className="font-semibold text-brand">Your Benefits:</span>{" "}
                    <span className="text-text-secondary">
                      +{nftData.benefits.extraVotesPerProject} extra votes per project
                      {nftData.benefits.canAutoApproveEvents && " — Events auto-approved"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-[12px] bg-bg-card border border-[var(--card-border)] text-center reveal-delay-2">
              <p className="text-text-secondary text-sm">Failed to load NFT data</p>
            </div>
          )}
        </div>

        {/* Referrals Section */}
        <div ref={referralRef} className="reveal mb-5">
          <div className="reveal-delay-1">
            <ReferralSection />
          </div>
        </div>

        {/* Hosted Events Section */}
        <div ref={hostedRef} className="reveal mb-5">
          <div className="flex items-center gap-2 mb-3 reveal-delay-1">
            <Mic2 className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-bold text-text-primary">Hosted Events</h2>
          </div>
          <div className="reveal-delay-2">
            <HostedBadges />
          </div>
        </div>

        {/* Your Events Section */}
        {stats && stats.createdEvents && stats.createdEvents.length > 0 && (
          <div ref={eventsRef} className="reveal mb-5">
            <div className="flex items-center gap-2 mb-3 reveal-delay-1">
              <Calendar className="h-4 w-4 text-green-500" />
              <h2 className="text-sm font-bold text-text-primary">Your Events</h2>
              <span className="text-[10px] font-mono text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded">
                {stats.createdEvents.length}
              </span>
            </div>
            <div className="space-y-2 reveal-delay-2">
              {stats.createdEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center gap-3 p-3 rounded-[12px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors duration-200"
                >
                  {evt.imageUrl && (
                    <img
                      src={evt.imageUrl}
                      alt={evt.title}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-text-primary truncate">{evt.title}</p>
                      <Badge
                        variant={
                          evt.rejectedAt
                            ? "error"
                            : evt.isApproved
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {evt.rejectedAt
                          ? "Rejected"
                          : evt.isApproved
                          ? "Approved"
                          : "Pending"}
                      </Badge>
                      <span className="text-[10px] text-text-tertiary font-mono px-1.5 py-0.5 rounded bg-bg-secondary">
                        {evt.event_type === "MINT_EVENT" ? "Mint" : evt.event_type === "HACKATHON" ? "Hackathon" : "Meetup"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                      {evt.mintDate && (
                        <span className="font-mono">{new Date(evt.mintDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      )}
                      <span className="flex items-center gap-0.5 font-mono">
                        {evt.event_type === "ECOSYSTEM_MEETUP" || evt.event_type === "HACKATHON" ? (
                          <><Star className="h-3 w-3 text-yellow-400" /> {evt.votesUp}</>
                        ) : (
                          <><ThumbsUp className="h-3 w-3" /> {Math.max(0, evt.votesUp) - Math.max(0, evt.votesDown)}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link
                      href={`/events/${evt.id}`}
                      className="p-2 rounded-lg bg-bg-secondary hover:bg-border transition-colors text-text-secondary hover:text-text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/events/${evt.id}/edit`}
                      className="p-2 rounded-lg bg-brand/10 hover:bg-brand/20 transition-colors text-brand"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-[12px] bg-bg-card border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Point History */}
            <div ref={activityRef} className="reveal">
              <div className="flex items-center gap-2 mb-3 reveal-delay-1">
                <Clock className="h-4 w-4 text-text-tertiary" />
                <h2 className="text-sm font-bold text-text-primary">Recent Activity</h2>
              </div>
              <div className="reveal-delay-2">
                {stats.pointHistory.length > 0 ? (
                  <div className="space-y-2">
                    {stats.pointHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-[12px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-text-secondary">
                            {getActionIcon(item.actionType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-text-primary">
                              {item.description || item.actionType.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-text-tertiary font-mono">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-sm font-mono",
                          item.points > 0
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          <Zap className="h-3.5 w-3.5" />
                          {item.points > 0 ? "+" : ""}{item.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl border border-border bg-bg-card">
                    <Clock className="h-6 w-6 text-text-tertiary mx-auto mb-2" />
                    <p className="text-text-secondary text-sm">
                      No activity yet. Start voting and completing missions!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary text-sm">Failed to load profile data</p>
          </div>
        )}
      </div>
    </div>
  );
}
