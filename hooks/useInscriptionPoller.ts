"use client";

import * as React from "react";

interface InscriptionProgress {
  phase: "image" | "metadata" | "complete" | "idle" | "error";
  status: string;
  progress: number; // 0-1
  messages: number;
  maxMessages: number;
  topicId: string | null;
  error: string | null;
}

const INITIAL_STATE: InscriptionProgress = {
  phase: "idle",
  status: "",
  progress: 0,
  messages: 0,
  maxMessages: 0,
  topicId: null,
  error: null,
};

export function useInscriptionPoller(badgeId: string) {
  const [data, setData] = React.useState<InscriptionProgress>(INITIAL_STATE);
  const [isPolling, setIsPolling] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = React.useCallback(() => {
    setIsPolling(true);
    setData((prev) => ({ ...prev, error: null }));
  }, []);

  const stopPolling = React.useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = React.useCallback(() => {
    stopPolling();
    setData(INITIAL_STATE);
  }, [stopPolling]);

  React.useEffect(() => {
    if (!isPolling || !badgeId) return;

    let failCount = 0;
    const MAX_FAILS = 5;

    async function poll() {
      try {
        const res = await fetch(`/api/badges/${badgeId}/inscription-status`);
        if (!res.ok) {
          failCount++;
          if (failCount >= MAX_FAILS) {
            setData((prev) => ({
              ...prev,
              phase: "error",
              error: "Could not check inscription status",
            }));
            setIsPolling(false);
          }
          return;
        }

        failCount = 0;
        const result = await res.json();

        setData({
          phase: result.phase,
          status: result.status,
          progress: result.progress || 0,
          messages: result.messages || 0,
          maxMessages: result.maxMessages || 0,
          topicId: result.topicId || null,
          error: result.error || null,
        });

        if (result.phase === "complete" || result.phase === "error") {
          setIsPolling(false);
        }
      } catch {
        failCount++;
        if (failCount >= MAX_FAILS) {
          setData((prev) => ({
            ...prev,
            phase: "error",
            error: "Network error checking inscription",
          }));
          setIsPolling(false);
        }
      }
    }

    // Poll immediately, then every 5 seconds
    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, badgeId]);

  return {
    ...data,
    isPolling,
    startPolling,
    stopPolling,
    reset,
  };
}
