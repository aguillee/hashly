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
  Users,
  Award,
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
      users: <Users className="h-5 w-5" />,
      badge: <Award className="h-5 w-5" />,
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
          "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
          mission.completed
            ? "bg-bg-card border-success/30"
            : "bg-bg-card border-border hover:border-accent-primary/30"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0",
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
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
            Missions
          </h1>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-primary" />
            <span className="text-lg font-bold text-text-primary">{(user.points ?? 0).toLocaleString()}</span>
            <span className="text-xs text-text-secondary">pts</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold text-text-primary">{user.loginStreak}d streak</span>
            {user.loginStreak >= 7 && <Badge variant="purple" size="sm">On fire!</Badge>}
          </div>
          {stats && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
                <Vote className="h-3.5 w-3.5 text-accent-primary" />
                <span className="font-bold text-text-primary">{stats.totalVotes}</span>
                <span className="text-text-secondary text-xs">votes</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
                <Calendar className="h-3.5 w-3.5 text-accent-primary" />
                <span className="font-bold text-text-primary">{stats.totalEvents}</span>
                <span className="text-text-secondary text-xs">events</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
                <Target className="h-3.5 w-3.5 text-accent-secondary" />
                <span className="font-bold text-text-primary">{stats.todayVotes}</span>
                <span className="text-text-secondary text-xs">today</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

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
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent-primary" />
                  Daily Missions
                </h2>
                <Badge variant="outline" size="sm">Resets daily</Badge>
              </div>
              <div className="p-3 space-y-2">
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
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent-secondary" />
                  Weekly Missions
                </h2>
                <Badge variant="outline" size="sm">Resets weekly</Badge>
              </div>
              <div className="p-3 space-y-2">
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

            {/* Season Missions */}
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Season Missions
                </h2>
                <Badge variant="purple" size="sm">Resets each season</Badge>
              </div>
              <div className="p-3 space-y-2">
                {achievements.length > 0 ? (
                  achievements.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-secondary">No season missions available</p>
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
