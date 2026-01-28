"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Sparkles,
  TrendingUp,
  Clock,
  LayoutGrid,
  CalendarDays,
  Infinity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EventCard } from "@/components/events/EventCard";
import { CalendarView } from "@/components/events/CalendarView";
import { useWalletStore, useEventsFilterStore } from "@/store";
import { cn } from "@/lib/utils";

// Types
interface Event {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  status: "UPCOMING" | "LIVE" | "ENDED";
  votesUp: number;
  votesDown: number;
  canVote?: boolean;
  voteLockedUntil?: string | null;
  isForeverMint?: boolean;
  source?: "SENTX" | "KABILA";
}

interface UserVote {
  eventId: string;
  voteType: "UP" | "DOWN";
}

const statusFilters = [
  { value: "all", label: "All Events", icon: Sparkles },
  { value: "live", label: "Live Now", icon: TrendingUp },
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "forever", label: "Forever Mints", icon: Infinity },
];

const sourceFilters = [
  { value: "all", label: "All Sources" },
  { value: "SENTX", label: "SentX" },
  { value: "KABILA", label: "Kabila" },
];

export default function CalendarPage() {
  const { isConnected } = useWalletStore();
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
  const [showFilters, setShowFilters] = React.useState(false);
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "SENTX" | "KABILA">("all");
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
    }
  }, [setStatus]);

  // Fetch events - use useCallback to avoid recreating the function
  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Handle forever mints filter
      if (status === "forever") {
        params.append("foreverMints", "only");
      } else {
        if (status !== "all") params.append("status", status);
        params.append("foreverMints", "exclude"); // Exclude forever mints from regular listing
      }

      if (searchQuery) params.append("search", searchQuery);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      params.append("sortBy", sortBy);

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
  }, [status, sortBy, searchQuery, sourceFilter]);

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
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Event Calendar</h1>
            <p className="text-text-secondary mt-1">Browse all upcoming NFT mints on Hedera</p>
          </div>
          {isConnected && (
            <Link href="/events/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Submit Event
              </Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              icon={<Search className="h-5 w-5" />}
            />
          </div>

          <div className="flex gap-2">
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "secondary"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
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
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
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
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-6 rounded-2xl bg-bg-card border border-border mb-8 space-y-6">
            {/* Status Filters */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setStatus(filter.value as "all" | "upcoming" | "live" | "ended" | "forever")}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                        status === filter.value
                          ? "bg-accent-primary text-white"
                          : "bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-secondary/80"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Source
              </label>
              <div className="flex flex-wrap gap-2">
                {sourceFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSourceFilter(filter.value as "all" | "SENTX" | "KABILA")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      sourceFilter === filter.value
                        ? "bg-accent-primary text-white"
                        : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "date", label: "Mint Date" },
                  { value: "votes", label: "Most Voted" },
                  { value: "newest", label: "Recently Added" },
                ].map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() => setSortBy(sort.value as "date" | "votes" | "newest")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
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
        )}

        {/* Events Listing */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-text-secondary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
