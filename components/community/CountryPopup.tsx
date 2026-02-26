"use client";

import { X, MapPin } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { countryByCode } from "@/lib/countries";
import type { CommunityProfile } from "@/hooks/useCommunityProfiles";

interface CountryPopupProps {
  countryCode: string;
  profiles: CommunityProfile[];
  onClose: () => void;
}

export function CountryPopup({ countryCode, profiles, onClose }: CountryPopupProps) {
  const country = countryByCode.get(countryCode);

  if (!country || profiles.length === 0) return null;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 max-w-[calc(100vw-2rem)] z-20 flex flex-col rounded-xl border border-border bg-bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{country.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {country.name}
            </h3>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profiles.length} member{profiles.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profiles list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
}
