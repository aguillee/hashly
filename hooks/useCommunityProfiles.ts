"use client";

import useSWR from "swr";

interface CommunityProfile {
  id: string;
  displayName: string;
  type: "USER" | "BUILDER" | "PERSON" | "PROJECT";
  twitterHandle: string | null;
  countryCode: string;
  bio: string | null;
  avatarUrl: string | null;
  isApproved?: boolean;
}

interface CommunityProfilesResponse {
  profiles: CommunityProfile[];
  byCountry: Record<string, CommunityProfile[]>;
  total: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCommunityProfiles() {
  const { data, error, isLoading, mutate } = useSWR<CommunityProfilesResponse>(
    "/api/community/profiles",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s cache
    }
  );

  return {
    profiles: data?.profiles || [],
    byCountry: data?.byCountry || {},
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useMyProfile() {
  const { data, error, isLoading, mutate } = useSWR<{ profile: CommunityProfile | null }>(
    "/api/community/profile",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    profile: data?.profile || null,
    isLoading,
    error,
    mutate,
  };
}

export type { CommunityProfile };
