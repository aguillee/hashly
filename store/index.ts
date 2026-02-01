import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  walletAddress: string;
  alias: string | null;
  points: number;
  loginStreak: number;
  isAdmin: boolean;
}

interface WalletState {
  // Connection state
  isConnected: boolean;
  walletAddress: string | null;
  accountId: string | null;

  // User data
  user: User | null;

  // Actions
  setConnected: (address: string, accountId: string) => void;
  setDisconnected: () => void;
  setUser: (user: User | null) => void;
  updatePoints: (points: number) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      isConnected: false,
      walletAddress: null,
      accountId: null,
      user: null,

      setConnected: (address, accountId) =>
        set({
          isConnected: true,
          walletAddress: address,
          accountId,
        }),

      setDisconnected: () =>
        set({
          isConnected: false,
          walletAddress: null,
          accountId: null,
          user: null,
        }),

      setUser: (user) => set({ user }),

      updatePoints: (points) =>
        set((state) => ({
          user: state.user ? { ...state.user, points } : null,
        })),
    }),
    {
      name: "wallet-storage",
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        accountId: state.accountId,
      }),
    }
  )
);

// Events filter store
interface EventsFilterState {
  status: "all" | "upcoming" | "live" | "forever" | "meetups";
  categories: string[]; // Multiple categories
  sortBy: "date" | "votes" | "newest";
  searchQuery: string;

  setStatus: (status: EventsFilterState["status"]) => void;
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  setSortBy: (sortBy: EventsFilterState["sortBy"]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useEventsFilterStore = create<EventsFilterState>((set) => ({
  status: "all",
  categories: [],
  sortBy: "date",
  searchQuery: "",

  setStatus: (status) => set({ status }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
    })),
  clearCategories: () => set({ categories: [] }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () =>
    set({
      status: "all",
      categories: [],
      sortBy: "date",
      searchQuery: "",
    }),
}));
