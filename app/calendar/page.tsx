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
  const [stateFilter, setStateFilter] = React.useState<"all" | "live" | "upcoming">("all");
  const [foreverMintsOnly, setForeverMintsOnly] = React.useState(false);

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
      if (sourceFilter !== "all") params.append("source", sourceFilter);
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

        // Invalidate featured and forever mints cache so homepage updates
        mutate("/api/events/featured");
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

  return (
    <div className="min-h-screen py-4 sm:py-8">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        {/* Compact Header - News style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-bg-card dark:bg-[#1a1a2e] border-2 border-accent-primary/50 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-sm border-2 border-bg-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Event Calendar</h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                <span className="">{events.length}</span> events on Hedera
              </p>
            </div>
          </div>
          {isConnected && (
            <Link href="/events/new">
              <Button className="gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Submit Event
              </Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="rounded-md"
            />
          </div>

          {/* View Mode Toggle - More square */}
          <div className="flex rounded-md border border-border overflow-hidden w-full sm:w-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                viewMode === "grid"
                  ? "bg-accent-primary text-white"
                  : "bg-bg-card text-text-secondary hover:text-text-primary"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                viewMode === "calendar"
                  ? "bg-accent-primary text-white"
                  : "bg-bg-card text-text-secondary hover:text-text-primary"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
          </div>
        </div>

        {/* Filters - Single scrollable line */}
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-bg-card border border-border/50 rounded-xl overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 sm:gap-3 min-w-max">
            {/* State */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wide font-semibold mr-0.5">State:</span>
              {stateFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStateFilter(filter.value as "all" | "live" | "upcoming")}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                      stateFilter === filter.value
                        ? "bg-accent-primary text-white"
                        : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-border/50" />

            {/* Type */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wide font-semibold mr-0.5">Type:</span>
              {typeFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatus(filter.value as "all" | "mints" | "forever" | "meetups" | "hackathons")}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                      status === filter.value
                        ? "bg-accent-primary text-white"
                        : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {filter.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-border/50" />

            {/* Source */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wide font-semibold mr-0.5">Source:</span>
              {sourceFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSourceFilter(filter.value as "all" | "SENTX" | "KABILA")}
                  className={cn(
                    "px-1.5 py-1 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                    sourceFilter === filter.value
                      ? "bg-accent-primary text-white"
                      : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                  )}
                >
                  {filter.label === "All Sources" ? "All" : filter.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border/50" />

            {/* Sort */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wide font-semibold mr-0.5">Sort:</span>
              {[
                { value: "date", label: "Date" },
                { value: "votes", label: "Votes" },
                { value: "newest", label: "New" },
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => setSortBy(sort.value as "date" | "votes" | "newest")}
                  className={cn(
                    "px-1.5 py-1 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                    sortBy === sort.value
                      ? "bg-accent-primary text-white"
                      : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                  )}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Listing */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-md bg-bg-secondary flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">
              No events found
            </h3>
            <p className="text-text-secondary mb-6">
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
          <CalendarView events={events} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
  );
}
