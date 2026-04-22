"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  Plus,
  Sparkles,
  Hexagon,
  TrendingUp,
  Clock,
  LayoutGrid,
  CalendarDays,
  Infinity,
  Users,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EventCard } from "@/components/events/EventCard";
import { CalendarView } from "@/components/events/CalendarView";
import { useWalletStore, useEventsFilterStore } from "@/store";
import { cn } from "@/lib/utils";
import { mutate } from "@/lib/swr";
import { useVoteLimitContext } from "@/contexts/VoteLimitContext";
import { useReveal } from "@/hooks/useReveal";

// Types
interface Event {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  endDate?: string | null;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  status: "UPCOMING" | "LIVE";
  votesUp: number;
  votesDown: number;
  canVote?: boolean;
  voteLockedUntil?: string | null;
  isForeverMint?: boolean;
  source?: "SENTX" | "KABILA";
  event_type?: "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";
  host?: string | null;
  location?: string | null;
  location_type?: string | null;
  hasBadge?: boolean;
}

interface UserVote {
  eventId: string;
  voteType: "UP" | "DOWN";
}

const stateFilters = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "live", label: "Live", icon: TrendingUp },
  { value: "upcoming", label: "Upcoming", icon: Clock },
];

const typeFilters = [
  { value: "all", label: "All Types", icon: Sparkles },
  { value: "mints", label: "Mint Events", icon: Hexagon },
  { value: "forever", label: "Forever Mints", icon: Infinity },
  { value: "meetups", label: "Meetups", icon: Users },
  { value: "hackathons", label: "Hackathons", icon: Code2 },
];

const sourceFilters = [
  { value: "all", label: "All Sources" },
  { value: "SENTX", label: "SentX" },
  { value: "KABILA", label: "Kabila" },
];

export default function CalendarPage() {
  const { isConnected } = useWalletStore();
  const { showLimitReachedModal, refreshVoteLimit } = useVoteLimitContext();
  const {
    status,
    sortBy,
    searchQuery,
    setStatus,
    setSortBy,
    setSearchQuery,
  } = useEventsFilterStore();

  const [events, setEvents] = React.useState<Event[]>([]);
  const [userVotes, setUserVotes] = React.useState<Record<string, "UP" | "DOWN">>({});
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "calendar">("grid");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "SENTX" | "KABILA">("all");
  const [stateFilter, setStateFilter] = React.useState<"all" | "live" | "upcoming">("upcoming");
  const [foreverMintsOnly, setForeverMintsOnly] = React.useState(false);

  const headerRef = useReveal();
  const filtersRef = useReveal();
  const contentRef = useReveal();

  // Track if initial URL params have been processed
  const initialLoadRef = React.useRef(false);

  // Check URL params for foreverMints filter (only once on mount)
  React.useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("foreverMints") === "only") {
      setForeverMintsOnly(true);
      setStatus("forever");
    } else if (params.get("eventType") === "ECOSYSTEM_MEETUP") {
      setStatus("meetups");
    } else if (params.get("eventType") === "HACKATHON") {
      setStatus("hackathons");
    }
  }, [setStatus]);

  // Fetch events - use useCallback to avoid recreating the function
  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Handle type filters
      if (status === "forever") {
        params.append("foreverMints", "only");
      } else if (status === "mints") {
        params.append("eventType", "MINT_EVENT");
        params.append("foreverMints", "exclude");
      } else if (status === "meetups") {
        params.append("eventType", "ECOSYSTEM_MEETUP");
      } else if (status === "hackathons") {
        params.append("eventType", "HACKATHON");
      } else {
        // "all" types - exclude forever mints from default view
        params.append("foreverMints", "exclude");
      }

      // Handle state filters
      if (stateFilter === "live") {
        params.append("status", "live");
      } else if (stateFilter === "upcoming") {
        params.append("status", "upcoming");
      }

      if (searchQuery) params.append("search", searchQuery);
      // Only apply source dropdown if the type filter hasn't already set a source
      if (sourceFilter !== "all" && status !== "forever") {
        params.append("source", sourceFilter);
      }
      params.append("sortBy", sortBy);
      params.append("limit", "100");

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();

      if (data.events) {
        setEvents(data.events);
        if (data.userVotes) {
          const votesMap: Record<string, "UP" | "DOWN"> = {};
          data.userVotes.forEach((vote: UserVote) => {
            votesMap[vote.eventId] = vote.voteType;
          });
          setUserVotes(votesMap);
        }
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [status, stateFilter, sortBy, searchQuery, sourceFilter]);

  // Fetch events when params change
  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle vote
  const handleVote = async (eventId: string, voteType: "UP" | "DOWN") => {
    if (!isConnected) return;

    try {
      const response = await fetch(`/api/events/${eventId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, useNftVotes: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? { ...event, votesUp: data.votesUp, votesDown: data.votesDown }
              : event
          )
        );
        setUserVotes((prev) => ({ ...prev, [eventId]: voteType }));

        // Invalidate all relevant SWR caches for real-time updates
        mutate("/api/events/featured");
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/events"), undefined, { revalidate: true });
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/forever-mints"), undefined, { revalidate: true });

        // Refresh vote limit in navbar
        refreshVoteLimit();
      } else if (response.status === 429) {
        // Daily vote limit reached - show modal
        showLimitReachedModal();
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  // Debounced search
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Count active filters
  const activeFilterCount = [
    stateFilter !== "all",
    status !== "all",
    sourceFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 reveal-delay-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
                Hedera Events
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
                Event Calendar
              </h1>
            </div>
            <div className="flex items-center gap-2.5 reveal-delay-2">
              <div className="flex items-center gap-2 px-3 h-9 rounded-[10px] border border-[var(--card-border)] bg-bg-card text-sm">
                <Calendar className="h-3.5 w-3.5 text-brand" />
                <span className="font-semibold text-text-primary tabular-nums">{events.length}</span>
                <span className="text-text-tertiary text-[11px] font-medium uppercase tracking-wider">events</span>
              </div>
              {isConnected && (
                <Link href="/events/new">
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Submit Event</span>
                    <span className="sm:hidden">Submit</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search + View Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 reveal-delay-3">
            <div className="flex-1">
              <Input
                placeholder="Search events…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Segmented view toggle — Arc style */}
            <div className="inline-flex h-10 p-1 rounded-[10px] border border-[var(--card-border)] bg-bg-card w-full sm:w-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 rounded-[7px] text-sm font-medium",
                  "transition-[background-color,color,box-shadow] duration-200 ease-out",
                  viewMode === "grid"
                    ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <LayoutGrid className="h-[15px] w-[15px]" />
                Grid
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 rounded-[7px] text-sm font-medium",
                  "transition-[background-color,color,box-shadow] duration-200 ease-out",
                  viewMode === "calendar"
                    ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <CalendarDays className="h-[15px] w-[15px]" />
                Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pb-8">
        {/* Filters — segmented pill control, Arc-style */}
        <div ref={filtersRef} className="reveal mb-5 sm:mb-7">
          <div className="p-2 sm:p-2 bg-bg-card/60 backdrop-blur-sm border border-[var(--card-border)] rounded-[12px] overflow-x-auto scrollbar-hide reveal-delay-1">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max pr-3">
              {/* State */}
              <div className="flex items-center gap-0.5 pl-1">
                <span className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-medium mr-1.5">State</span>
                {stateFilters.map((filter) => {
                  const Icon = filter.icon;
                  const active = stateFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setStateFilter(filter.value as "all" | "live" | "upcoming")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[11px] font-medium whitespace-nowrap",
                        "transition-[background-color,color,box-shadow] duration-200 ease-out active:scale-[0.97]",
                        active
                          ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-[var(--border-subtle)]" />

              {/* Type */}
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-medium mr-1.5">Type</span>
                {typeFilters.map((filter) => {
                  const Icon = filter.icon;
                  const active = status === filter.value;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setStatus(filter.value as "all" | "mints" | "forever" | "meetups" | "hackathons")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[11px] font-medium whitespace-nowrap",
                        "transition-[background-color,color,box-shadow] duration-200 ease-out active:scale-[0.97]",
                        active
                          ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {filter.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-[var(--border-subtle)]" />

              {/* Source */}
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-medium mr-1.5">Source</span>
                {sourceFilters.map((filter) => {
                  const active = sourceFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setSourceFilter(filter.value as "all" | "SENTX" | "KABILA")}
                      className={cn(
                        "px-2.5 h-7 rounded-[7px] text-[11px] font-medium whitespace-nowrap",
                        "transition-[background-color,color,box-shadow] duration-200 ease-out active:scale-[0.97]",
                        active
                          ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
                      )}
                    >
                      {filter.label === "All Sources" ? "All" : filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-[var(--border-subtle)]" />

              {/* Sort */}
              <div className="flex items-center gap-0.5 pr-1">
                <span className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-medium mr-1.5">Sort</span>
                {[
                  { value: "date", label: "Date" },
                  { value: "votes", label: "Votes" },
                  { value: "newest", label: "New" },
                ].map((sort) => {
                  const active = sortBy === sort.value;
                  return (
                    <button
                      key={sort.value}
                      onClick={() => setSortBy(sort.value as "date" | "votes" | "newest")}
                      className={cn(
                        "px-2.5 h-7 rounded-[7px] text-[11px] font-medium whitespace-nowrap",
                        "transition-[background-color,color,box-shadow] duration-200 ease-out active:scale-[0.97]",
                        active
                          ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
                      )}
                    >
                      {sort.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Events Listing */}
        <div ref={contentRef} className="reveal">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 reveal-delay-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[12px] border border-[var(--card-border)] bg-bg-card overflow-hidden"
                >
                  <div className="aspect-[16/10] bg-bg-secondary/60 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-bg-secondary/60 animate-pulse rounded-md" />
                    <div className="h-3 w-1/2 bg-bg-secondary/40 animate-pulse rounded-md" />
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="h-6 w-14 bg-bg-secondary/50 animate-pulse rounded-md" />
                      <div className="h-6 w-10 bg-bg-secondary/40 animate-pulse rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 reveal-delay-1">
              <div className="w-16 h-16 rounded-[12px] bg-bg-secondary border border-[var(--card-border)] flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">
                No events found
              </h3>
              <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Be the first to submit an event!"}
              </p>
              {isConnected && (
                <Link href="/events/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Submit Event
                  </Button>
                </Link>
              )}
            </div>
          ) : viewMode === "calendar" ? (
            <div className="reveal-delay-1">
              <CalendarView events={events} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 reveal-delay-1">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userVote={userVotes[event.id]}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
