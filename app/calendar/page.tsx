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
  category: string;
  status: "UPCOMING" | "LIVE" | "ENDED";
  votesUp: number;
  votesDown: number;
  canVote?: boolean;
  voteLockedUntil?: string | null;
}

interface UserVote {
  eventId: string;
  voteType: "UP" | "DOWN";
}

const categories = [
  { value: "all", label: "All" },
  { value: "pfp", label: "PFP" },
  { value: "art", label: "Art" },
  { value: "gaming", label: "Gaming" },
  { value: "utility", label: "Utility" },
  { value: "metaverse", label: "Metaverse" },
];

const statusFilters = [
  { value: "all", label: "All Events", icon: Sparkles },
  { value: "live", label: "Live Now", icon: TrendingUp },
  { value: "upcoming", label: "Upcoming", icon: Clock },
];

export default function CalendarPage() {
  const { isConnected } = useWalletStore();
  const {
    status,
    categories: selectedCategories,
    sortBy,
    searchQuery,
    setStatus,
    toggleCategory,
    clearCategories,
    setSortBy,
    setSearchQuery,
  } = useEventsFilterStore();

  const [events, setEvents] = React.useState<Event[]>([]);
  const [userVotes, setUserVotes] = React.useState<Record<string, "UP" | "DOWN">>({});
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "calendar">("grid");
  const [showFilters, setShowFilters] = React.useState(false);

  // Fetch events
  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (status !== "all") params.append("status", status);
        if (selectedCategories.length > 0) {
          selectedCategories.forEach((cat) => params.append("category", cat));
        }
        if (searchQuery) params.append("search", searchQuery);
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
    };

    fetchEvents();
  }, [status, selectedCategories, sortBy, searchQuery]);

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
                      onClick={() => setStatus(filter.value as "all" | "upcoming" | "live" | "ended")}
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

            {/* Category Filters */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-primary">
                  Categories
                </label>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={clearCategories}
                    className="text-xs text-accent-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.slice(1).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      selectedCategories.includes(cat.value)
                        ? "bg-accent-primary text-white"
                        : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {cat.label}
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
