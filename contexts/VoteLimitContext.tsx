"use client";

import * as React from "react";
import { VoteLimitModal } from "@/components/votes/VoteLimitModal";
import { mutate } from "swr";

interface VoteHistoryItem {
  type: "event" | "collection" | "token";
  id: string;
  name: string;
  imageUrl?: string | null;
  symbol?: string;
  eventType?: string;
  voteType?: string;
  voteWeight?: number;
  timestamp: string;
}

interface VoteLimitData {
  limit: number;
  remaining: number;
  used: number;
  resetsAt: string;
  history: VoteHistoryItem[];
}

interface VoteLimitContextType {
  showLimitReachedModal: () => void;
  refreshVoteLimit: () => void;
}

const VoteLimitContext = React.createContext<VoteLimitContextType | null>(null);

export function useVoteLimitContext() {
  const context = React.useContext(VoteLimitContext);
  if (!context) {
    throw new Error("useVoteLimitContext must be used within VoteLimitProvider");
  }
  return context;
}

export function VoteLimitProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [voteLimitData, setVoteLimitData] = React.useState<VoteLimitData | null>(null);

  const fetchVoteLimitData = React.useCallback(async () => {
    try {
      const response = await fetch("/api/users/vote-limit");
      if (response.ok) {
        const data = await response.json();
        setVoteLimitData(data);
        return data;
      }
    } catch (error) {
      console.error("Failed to fetch vote limit:", error);
    }
    return null;
  }, []);

  const showLimitReachedModal = React.useCallback(async () => {
    // Fetch fresh data before showing modal
    await fetchVoteLimitData();
    setIsModalOpen(true);
  }, [fetchVoteLimitData]);

  const refreshVoteLimit = React.useCallback(() => {
    // Revalidate SWR cache
    mutate("/api/users/vote-limit");
    fetchVoteLimitData();
  }, [fetchVoteLimitData]);

  const handleClose = React.useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <VoteLimitContext.Provider value={{ showLimitReachedModal, refreshVoteLimit }}>
      {children}
      {voteLimitData && (
        <VoteLimitModal
          open={isModalOpen}
          onClose={handleClose}
          remaining={voteLimitData.remaining}
          limit={voteLimitData.limit}
          used={voteLimitData.used}
          resetsAt={voteLimitData.resetsAt}
          history={voteLimitData.history || []}
        />
      )}
    </VoteLimitContext.Provider>
  );
}
