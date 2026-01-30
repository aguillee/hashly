import useSWR, { SWRConfiguration } from "swr";

// Global fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
};

// Default SWR config for the app
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
};

// ============ HOOKS ============

// Featured events (homepage)
export function useFeatured() {
  return useSWR("/api/events/featured", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    refreshInterval: 30000, // Auto-refresh every 30s
  });
}

// Events list
export function useEvents(params?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const url = `/api/events${query ? `?${query}` : ""}`;

  return useSWR(url, fetcher);
}

// Single event
export function useEvent(id: string | null) {
  return useSWR(id ? `/api/events/${id}` : null, fetcher);
}

// Forever mints
export function useForeverMints(params?: { limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const url = `/api/forever-mints${query ? `?${query}` : ""}`;

  return useSWR(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // Auto-refresh every 30s
  });
}

// Collections
export function useCollections(search?: string) {
  const url = search
    ? `/api/collections?search=${encodeURIComponent(search)}`
    : "/api/collections";

  return useSWR(url, fetcher, {
    dedupingInterval: 10000,
    revalidateOnFocus: true,
    refreshInterval: 30000,
  });
}

// Leaderboard
export function useLeaderboard(limit = 50) {
  return useSWR(`/api/leaderboard?limit=${limit}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  });
}

// User profile
export function useProfile() {
  return useSWR("/api/profile", fetcher, {
    revalidateOnFocus: true,
  });
}

// Calendar events
export function useCalendarEvents(month?: string, year?: string) {
  const searchParams = new URLSearchParams();
  if (month) searchParams.set("month", month);
  if (year) searchParams.set("year", year);

  const query = searchParams.toString();
  const url = `/api/events/calendar${query ? `?${query}` : ""}`;

  return useSWR(url, fetcher);
}

// Missions
export function useMissions() {
  return useSWR("/api/missions", fetcher);
}

// Export mutate for manual revalidation
export { mutate } from "swr";
