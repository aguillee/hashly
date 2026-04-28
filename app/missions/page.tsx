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
  Globe,
  Building2,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

interface Mission {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  type: "DAILY" | "WEEKLY" | "ACHIEVEMENT" | "SEASON";
  requirement: number;
  icon: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  permanent?: boolean;
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

  const headerRef = useReveal();
  const dailyRef = useReveal();
  const weeklyRef = useReveal();
  const seasonRef = useReveal();
  const uniqueRef = useReveal();

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
        setMissions(prev =>
          prev.map(m => m.id === missionId ? { ...m, claimed: true } : m)
        );
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
      globe: <Globe className="h-5 w-5" />,
      buildings: <Building2 className="h-5 w-5" />,
    };
    return icons[iconName] || <Sparkles className="h-5 w-5" />;
  };

  const dailyMissions = missions.filter((m) => m.type === "DAILY");
  const weeklyMissions = missions.filter((m) => m.type === "WEEKLY");
  const achievements = missions.filter((m) => m.type === "ACHIEVEMENT" && !m.permanent);
  const permanentMissions = missions.filter((m) => m.permanent);

  const MissionCard = ({ mission }: { mission: Mission }) => {
    const progressPercent = Math.min((mission.progress / mission.requirement) * 100, 100);

    return (
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200",
          mission.completed
            ? "bg-green-500/[0.03] border-green-500/20"
            : "bg-bg-card border-border hover:border-brand/20"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0",
            mission.completed
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-bg-secondary text-text-secondary"
          )}
        >
          {mission.completed ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : getIcon(mission.icon)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-text-primary text-sm sm:text-base">{mission.name}</h3>
            {mission.completed && (
              <Badge variant="success" size="sm">Done</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{mission.description}</p>

          {/* Progress bar with animation */}
          {!mission.completed && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1.5">
                <span className="text-text-tertiary">Progress</span>
                <span className="font-medium text-text-primary font-mono">
                  {mission.progress} / {mission.requirement}
                </span>
              </div>
              <div className="h-1.5 sm:h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-700 ease-out progress-fill"
                  style={{ width: `${progressPercent}%` }}
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
                "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-bold text-white text-sm transition-all duration-150",
                "bg-brand hover:bg-teal-600 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {claimingId === mission.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="font-mono">+{mission.pointsReward}</span>
            </button>
          ) : (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              mission.claimed
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-bg-secondary border border-border"
            )}>
              <Zap className={cn("h-3.5 w-3.5", mission.claimed ? "" : "text-text-tertiary")} />
              <span className={cn("font-bold font-mono text-sm", !mission.claimed && "text-text-primary")}>
                +{mission.pointsReward}
              </span>
            </div>
          )}
          {mission.claimed && (
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1 justify-end mt-1.5">
              <CheckCircle className="h-3 w-3" />
              Claimed
            </span>
          )}
        </div>
      </div>
    );
  };

  const MissionSection = ({
    title,
    icon,
    badge,
    missions: sectionMissions,
    revealRef,
    emptyText,
  }: {
    title: string;
    icon: React.ReactNode;
    badge: string;
    missions: Mission[];
    revealRef: React.Ref<HTMLDivElement>;
    emptyText: string;
  }) => (
    <div ref={revealRef} className="reveal mb-5">
      <div className="flex items-center justify-between mb-3 reveal-delay-1">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <Badge variant="default" size="sm">{badge}</Badge>
      </div>
      <div className="space-y-2 reveal-delay-2">
        {sectionMissions.length > 0 ? (
          sectionMissions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))
        ) : (
          <div className="text-center py-8 rounded-xl border border-border bg-bg-card">
            <p className="text-text-secondary text-sm">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4 reveal-delay-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary mb-2">
                Earn Points
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
                Missions
              </h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-card border border-border">
              <Zap className="h-4 w-4 text-brand" />
              <span className="text-lg font-bold text-text-primary font-mono tabular-nums">{(user.points ?? 0).toLocaleString()}</span>
              <span className="text-xs text-text-tertiary">pts</span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap reveal-delay-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[var(--card-border)] bg-bg-card text-sm">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-bold text-text-primary font-mono">{user.loginStreak}d</span>
              <span className="text-text-tertiary text-xs">streak</span>
            </div>
            {stats && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[var(--card-border)] bg-bg-card text-sm">
                  <Vote className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-bold text-text-primary font-mono">{stats.totalVotes}</span>
                  <span className="text-text-tertiary text-xs">votes</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[var(--card-border)] bg-bg-card text-sm">
                  <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-bold text-text-primary font-mono">{stats.totalEvents}</span>
                  <span className="text-text-tertiary text-xs">events</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[var(--card-border)] bg-bg-card text-sm">
                  <Target className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-bold text-text-primary font-mono">{stats.todayVotes}</span>
                  <span className="text-text-tertiary text-xs">today</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        {/* Event creation CTA */}
        <div className="mb-3 p-4 rounded-xl border border-brand/20 bg-brand/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-text-primary text-sm">+100 pts per approved event</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Do you know of an upcoming event? Add it and earn points for each one that gets approved.
              </p>
            </div>
            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:bg-teal-600 transition-colors flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Create event
            </Link>
          </div>
        </div>

        {/* Ecosystem project CTA */}
        <div className="mb-5 p-4 rounded-xl border border-accent-coral/25 bg-accent-coral/[0.04]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-coral/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-accent-coral" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-text-primary text-sm">+100 pts per approved Ecosystem project</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Building on Hedera? Submit your project to the Ecosystem and earn points when it gets approved.
              </p>
            </div>
            <Link
              href="/ecosystem/apply"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-coral text-white text-xs font-bold hover:brightness-110 transition-[filter] flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add project
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
            <p className="text-text-secondary text-sm">Loading missions...</p>
          </div>
        ) : (
          <>
            <MissionSection
              title="Daily Missions"
              icon={<Calendar className="h-4 w-4 text-text-tertiary" />}
              badge="Resets daily"
              missions={dailyMissions}
              revealRef={dailyRef}
              emptyText="No daily missions available"
            />

            <MissionSection
              title="Weekly Missions"
              icon={<Target className="h-4 w-4 text-text-tertiary" />}
              badge="Resets weekly"
              missions={weeklyMissions}
              revealRef={weeklyRef}
              emptyText="No weekly missions available"
            />

            <MissionSection
              title="Season Missions"
              icon={<Trophy className="h-4 w-4 text-text-tertiary" />}
              badge="Resets each season"
              missions={achievements}
              revealRef={seasonRef}
              emptyText="No season missions available"
            />

            {permanentMissions.length > 0 && (
              <MissionSection
                title="Unique Missions"
                icon={<Star className="h-4 w-4 text-text-tertiary" />}
                badge="One time only"
                missions={permanentMissions}
                revealRef={uniqueRef}
                emptyText="No unique missions available"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
