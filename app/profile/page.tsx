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
  const nftRef = useReveal();
  const referralRef = useReveal();
  const hostedRef = useReveal();
  const eventsRef = useReveal();
  const statsRef = useReveal();
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="reveal-delay-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
              Your Account
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3">
              Profile
            </h1>
          </div>

          {/* Wallet + Alias */}
          <div className="flex items-center gap-2 flex-wrap reveal-delay-2">
            <button
              onClick={copyAddress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:border-brand/20 transition-all text-sm"
            >
              <span className="text-text-secondary text-xs sm:text-sm font-mono">
                {user.walletAddress}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-text-tertiary" />
              )}
            </button>
            {editingAlias ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="Enter alias..."
                  maxLength={20}
                  className="px-2.5 py-1.5 rounded-lg bg-bg-card border border-brand/30 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 w-32"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveAlias();
                    if (e.key === "Escape") setEditingAlias(false);
                  }}
                />
                <button
                  onClick={saveAlias}
                  disabled={savingAlias}
                  className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  {savingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setEditingAlias(false)}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditAlias}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-card border border-border hover:border-brand/20 transition-all text-sm"
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
          </div>

          {/* Points & Streak Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 reveal-delay-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-card border border-border">
              <Zap className="h-5 w-5 text-brand" />
              <span className="text-2xl font-bold text-text-primary font-mono tabular-nums">
                {(user.totalPoints ?? user.points ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-tertiary">pts</span>
            </div>
            {((user.badgePoints ?? 0) > 0 || (user.referralPoints ?? 0) > 0) && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="font-mono">{user.points ?? 0}</span> missions
                {(user.badgePoints ?? 0) > 0 && (
                  <><span className="text-text-tertiary">+</span> <span className="font-mono">{user.badgePoints}</span> badges</>
                )}
                {(user.referralPoints ?? 0) > 0 && (
                  <><span className="text-text-tertiary">+</span> <span className="font-mono">{user.referralPoints}</span> referrals</>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 text-sm">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-bold text-text-primary font-mono">{user.loginStreak}d</span>
              <span className="text-text-tertiary text-xs">streak</span>
              {user.loginStreak >= 7 && <Badge variant="purple" size="sm">On fire!</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        {/* NFTs Section */}
        <div ref={nftRef} className="reveal mb-5">
          <div className="flex items-center gap-2 mb-3 reveal-delay-1">
            <Shield className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-bold text-text-primary">Detected NFTs</h2>
          </div>

          {loadingNFTs ? (
            <div className="p-8 rounded-xl bg-bg-card border border-border text-center reveal-delay-2">
              <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
              <p className="text-text-secondary text-sm">Loading NFTs...</p>
            </div>
          ) : nftData ? (
            <div className="reveal-delay-2">
              <div className="grid md:grid-cols-2 gap-3">
                {/* Dragons */}
                <div className="p-4 rounded-xl bg-bg-card border border-border hover:border-brand/20 transition-all">
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
                <div className="p-4 rounded-xl bg-bg-card border border-border hover:border-brand/20 transition-all">
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
            <div className="p-8 rounded-xl bg-bg-card border border-border text-center reveal-delay-2">
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border hover:border-brand/20 transition-all"
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
                      <Badge variant={evt.isApproved ? "success" : "warning"} size="sm">
                        {evt.isApproved ? "Approved" : "Pending"}
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
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <p className="text-text-secondary text-sm">Loading profile...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div ref={statsRef} className="reveal mb-5">
              <div className="flex items-center gap-2 mb-3 reveal-delay-1">
                <TrendingUp className="h-4 w-4 text-text-tertiary" />
                <h2 className="text-sm font-bold text-text-primary">Stats</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 reveal-delay-2">
                <div className="p-3 rounded-xl bg-bg-card border border-border hover:border-brand/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                      <Vote className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <span className="text-xs text-text-tertiary">Votes</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary font-mono tabular-nums">{stats.totalVotes}</p>
                </div>

                <div className="p-3 rounded-xl bg-bg-card border border-border hover:border-green-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <span className="text-xs text-text-tertiary">Events</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary font-mono tabular-nums">{stats.approvedEvents}</p>
                </div>

                <div className="p-3 rounded-xl bg-bg-card border border-border hover:border-purple-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                    <span className="text-xs text-text-tertiary">Rank</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary font-mono tabular-nums">#{stats.rank}</p>
                </div>

                <div className="p-3 rounded-xl bg-bg-card border border-border hover:border-yellow-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <span className="text-xs text-text-tertiary">Percentile</span>
                  </div>
                  <p className="text-xl font-bold text-text-primary font-mono tabular-nums">Top {Math.round((stats.rank / stats.totalUsers) * 100)}%</p>
                  <p className="text-[10px] text-text-tertiary font-mono mt-0.5">of {stats.totalUsers}</p>
                </div>
              </div>
            </div>

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
                        className="flex items-center justify-between p-3 rounded-xl bg-bg-card border border-border hover:border-brand/20 transition-all"
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
