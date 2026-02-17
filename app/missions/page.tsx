"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Target,
  Calendar,
  Trophy,
  CheckCircle,
  Zap,
  Flame,
  Vote,
  Gift,
  Loader2,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";

interface Mission {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT";
  requirement: number;
  icon: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface UserStats {
  totalVotes: number;
  totalEvents: number;
  loginStreak: number;
  todayVotes: number;
  weekVotes: number;
}

export default function MissionsPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [missions, setMissions] = React.useState<Mission[]>([]);
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [claimingId, setClaimingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  React.useEffect(() => {
    if (isConnected && user) {
      loadMissionsAndStats();
    }
  }, [isConnected, user]);

  async function loadMissionsAndStats() {
    try {
      setLoading(true);
      const response = await fetch("/api/missions");
      if (response.ok) {
        const data = await response.json();
        setMissions(data.missions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load missions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function claimMission(missionId: string) {
    try {
      setClaimingId(missionId);
      const response = await fetch("/api/missions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setMissions(prev =>
          prev.map(m => m.id === missionId ? { ...m, claimed: true } : m)
        );
        // Refresh to get updated points
        await loadMissionsAndStats();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Error ${response.status}`;
        alert(`No se pudo reclamar: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Failed to claim mission:", error);
      alert("Error de conexión al reclamar la misión");
    } finally {
      setClaimingId(null);
    }
  }

  if (!isConnected || !user) {
    return null;
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      calendar: <Calendar className="h-5 w-5" />,
      vote: <Vote className="h-5 w-5" />,
      flame: <Flame className="h-5 w-5" />,
      trophy: <Trophy className="h-5 w-5" />,
      target: <Target className="h-5 w-5" />,
      gift: <Gift className="h-5 w-5" />,
    };
    return icons[iconName] || <Sparkles className="h-5 w-5" />;
  };

  const dailyMissions = missions.filter((m) => m.type === "DAILY");
  const weeklyMissions = missions.filter((m) => m.type === "WEEKLY");
  const achievements = missions.filter((m) => m.type === "ACHIEVEMENT");

  const MissionCard = ({ mission }: { mission: Mission }) => {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-5 rounded-lg border transition-all duration-300",
          mission.completed
            ? "bg-success/5 border-success/30"
            : "bg-bg-card/50 border-border hover:border-accent-primary/30 hover:bg-accent-primary/5"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0",
            mission.completed
              ? "bg-success/20 text-success"
              : "bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 text-accent-primary"
          )}
        >
          {mission.completed ? <CheckCircle className="h-6 w-6" /> : getIcon(mission.icon)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary">{mission.name}</h3>
            {mission.completed && (
              <Badge variant="live" size="sm">
                Completed
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{mission.description}</p>

          {/* Progress bar */}
          {!mission.completed && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-secondary">Progress</span>
                <span className="font-medium text-text-primary">
                  {mission.progress} / {mission.requirement}
                </span>
              </div>
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((mission.progress / mission.requirement) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reward / Claim */}
        <div className="text-right flex-shrink-0">
          {mission.completed && !mission.claimed ? (
            <button
              onClick={() => claimMission(mission.id)}
              disabled={claimingId === mission.id}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-md font-bold text-white transition-all",
                "bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-lg hover:shadow-accent-primary/30",
                "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {claimingId === mission.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>Claim +{mission.pointsReward}</span>
            </button>
          ) : (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md",
              mission.claimed
                ? "bg-success/10 text-success"
                : "bg-accent-primary/10 border border-accent-primary/20"
            )}>
              <Zap className={cn("h-4 w-4", mission.claimed ? "text-success" : "text-accent-primary")} />
              <span className={cn("font-bold", mission.claimed ? "text-success" : "text-accent-primary")}>
                +{mission.pointsReward}
              </span>
            </div>
          )}
          {mission.claimed && (
            <span className="text-xs font-medium text-success flex items-center gap-1 justify-end mt-2">
              <CheckCircle className="h-3 w-3" />
              Claimed
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-accent-secondary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary shadow-xl shadow-accent-primary/30 mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Missions</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Complete actions to earn points automatically
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Points Card */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative p-6 rounded-lg bg-bg-card border border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <Star className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">Your Stats</p>
                  <p className="text-2xl font-bold text-text-primary">Keep earning!</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary font-medium">Total Points</p>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <Zap className="h-6 w-6 text-accent-primary" />
                  <span className="gradient-text">{(user.points ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="w-10 h-10 rounded-md bg-orange-500/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-text-primary">{user.loginStreak} day streak</span>
                <p className="text-sm text-text-secondary">Keep logging in to earn bonus points!</p>
              </div>
              {user.loginStreak >= 7 && (
                <Badge variant="coral">On fire!</Badge>
              )}
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center p-4 rounded-lg bg-bg-secondary/50">
                  <p className="text-2xl font-bold text-text-primary">{stats.totalVotes}</p>
                  <p className="text-xs text-text-secondary font-medium">Total Votes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-bg-secondary/50">
                  <p className="text-2xl font-bold text-text-primary">{stats.totalEvents}</p>
                  <p className="text-xs text-text-secondary font-medium">Events Created</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-bg-secondary/50">
                  <p className="text-2xl font-bold text-text-primary">{stats.todayVotes}</p>
                  <p className="text-xs text-text-secondary font-medium">Today's Votes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
            <p className="text-text-secondary">Loading missions...</p>
          </div>
        ) : (
          <>
            {/* Daily Missions */}
            <div className="rounded-lg border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden mb-6">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-accent-primary/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-accent-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Daily Missions</h2>
                </div>
                <Badge variant="outline">Resets daily</Badge>
              </div>
              <div className="p-4 space-y-3">
                {dailyMissions.length > 0 ? (
                  dailyMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-secondary">No daily missions available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Missions */}
            <div className="rounded-lg border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden mb-6">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-accent-secondary/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-accent-secondary" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Weekly Missions</h2>
                </div>
                <Badge variant="outline">Resets weekly</Badge>
              </div>
              <div className="p-4 space-y-3">
                {weeklyMissions.length > 0 ? (
                  weeklyMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-secondary">No weekly missions available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="rounded-lg border border-border bg-bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
                </div>
                <Badge variant="coral">Permanent</Badge>
              </div>
              <div className="p-4 space-y-3">
                {achievements.length > 0 ? (
                  achievements.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-secondary">No achievements available</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
