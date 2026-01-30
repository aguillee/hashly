"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";

interface PointHistoryItem {
  id: string;
  points: number;
  actionType: string;
  description: string | null;
  createdAt: string;
}

interface ProfileStats {
  totalVotes: number;
  totalEvents: number;
  approvedEvents: number;
  rank: number;
  totalUsers: number;
  pointHistory: PointHistoryItem[];
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
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-accent-secondary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-xl mb-6">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">My Profile</span>
          </h1>
          <button
            onClick={copyAddress}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card/80 backdrop-blur-sm border border-border hover:border-accent-primary/50 transition-all"
          >
            <span className="font-mono text-text-secondary text-sm">
              {user.walletAddress}
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4 text-text-secondary" />
            )}
          </button>

          {/* Alias */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {editingAlias ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="Enter alias..."
                  maxLength={20}
                  className="px-3 py-1.5 rounded-lg bg-bg-card border border-accent-primary/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50 w-40 text-center"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveAlias();
                    if (e.key === "Escape") setEditingAlias(false);
                  }}
                />
                <button
                  onClick={saveAlias}
                  disabled={savingAlias}
                  className="p-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                >
                  {savingAlias ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingAlias(false)}
                  className="p-1.5 rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditAlias}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card/60 border border-border hover:border-accent-primary/50 transition-all text-sm"
              >
                <span className="text-text-secondary">
                  {user.alias ? (
                    <>Alias: <span className="text-text-primary font-medium">{user.alias}</span></>
                  ) : (
                    "Set alias for leaderboard"
                  )}
                </span>
                <Pencil className="h-3 w-3 text-text-secondary" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Points & Streak Card */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative p-6 rounded-3xl bg-bg-card border border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              {/* Points */}
              <div className="text-center md:text-left">
                <p className="text-sm text-text-secondary font-medium">Total Points</p>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Zap className="h-8 w-8 text-accent-primary" />
                  <span className="text-4xl font-bold gradient-text">
                    {(user.points ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <span className="font-semibold text-text-primary">{user.loginStreak} day streak</span>
                  <p className="text-sm text-text-secondary">Keep logging in daily!</p>
                </div>
                {user.loginStreak >= 7 && <Badge variant="coral">On fire!</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* NFTs Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-accent-primary" />
            <h2 className="text-xl font-bold">Detected NFTs</h2>
          </div>

          {loadingNFTs ? (
            <div className="p-8 rounded-2xl bg-bg-card/50 border border-border text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary mx-auto mb-2" />
              <p className="text-text-secondary">Loading NFTs...</p>
            </div>
          ) : nftData ? (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Dragons */}
              <div className="p-5 rounded-2xl bg-bg-card/50 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Santuario Hedera (Dragons)</h3>
                  <a
                    href="https://sentx.io/nft-marketplace/santuario-hedera"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:text-accent-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {nftData.stats.totalDragons > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default">{nftData.stats.totalDragons} Dragons</Badge>
                      <Badge variant="success">+{nftData.stats.potentialVotes.dragonVotes} votes/project</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Serials: {nftData.nfts.dragons.slice(0, 10).map(d => `#${d.serialNumber}`).join(", ")}
                      {nftData.nfts.dragons.length > 10 && ` +${nftData.nfts.dragons.length - 10} more`}
                    </div>
                  </>
                ) : (
                  <p className="text-text-secondary text-sm">No dragons detected</p>
                )}
              </div>

              {/* El Santuario */}
              <div className="p-5 rounded-2xl bg-bg-card/50 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">El Santuario</h3>
                  <a
                    href="https://sentx.io/nft-marketplace/el-santuario"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:text-accent-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {nftData.stats.hasSantuario ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="default">Holder</Badge>
                      <Badge variant="success">+{nftData.stats.potentialVotes.santuarioVotes} votes/project</Badge>
                      <Badge variant="coral">Auto-approve events</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Serial: #{nftData.nfts.santuario[0]?.serialNumber}
                    </div>
                  </>
                ) : (
                  <p className="text-text-secondary text-sm">No El Santuario NFT detected</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-bg-card/50 border border-border text-center">
              <p className="text-text-secondary">Failed to load NFT data</p>
            </div>
          )}

          {/* Benefits Summary */}
          {nftData && nftData.benefits.extraVotesPerProject > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/20">
              <p className="text-sm">
                <span className="font-semibold text-accent-primary">Your Benefits:</span>{" "}
                <span className="text-text-secondary">
                  +{nftData.benefits.extraVotesPerProject} extra votes per project
                  {nftData.benefits.canAutoApproveEvents && " • Events auto-approved"}
                </span>
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
            <p className="text-text-secondary">Loading profile...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-5 rounded-2xl bg-bg-card/50 backdrop-blur-sm border border-border text-center hover:border-accent-primary/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Vote className="h-6 w-6 text-accent-primary" />
                </div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalVotes}</p>
                <p className="text-xs text-text-secondary font-medium">Total Votes</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-card/50 backdrop-blur-sm border border-border text-center hover:border-success/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-success" />
                </div>
                <p className="text-2xl font-bold text-text-primary">{stats.approvedEvents}</p>
                <p className="text-xs text-text-secondary font-medium">Events Created</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-card/50 backdrop-blur-sm border border-border text-center hover:border-purple-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-text-primary">#{stats.rank}</p>
                <p className="text-xs text-text-secondary font-medium">Leaderboard Rank</p>
              </div>

              <div className="p-5 rounded-2xl bg-bg-card/50 backdrop-blur-sm border border-border text-center hover:border-yellow-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-text-primary">Top {Math.round((stats.rank / stats.totalUsers) * 100)}%</p>
                <p className="text-xs text-text-secondary font-medium">of {stats.totalUsers} users</p>
              </div>
            </div>

            {/* Point History */}
            <div className="rounded-3xl border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Recent Activity</h2>
              </div>
              <div className="p-4">
                {stats.pointHistory.length > 0 ? (
                  <div className="space-y-3">
                    {stats.pointHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-bg-secondary/50 border border-border hover:border-accent-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-bg-card flex items-center justify-center text-accent-primary">
                            {getActionIcon(item.actionType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-text-primary">
                              {item.description || item.actionType.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm",
                          item.points > 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"
                        )}>
                          <Zap className="h-4 w-4" />
                          {item.points > 0 ? "+" : ""}{item.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-accent-primary" />
                    </div>
                    <p className="text-text-secondary">
                      No activity yet. Start voting and completing missions!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary">Failed to load profile data</p>
          </div>
        )}
      </div>
    </div>
  );
}
