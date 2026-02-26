"use client";

import { ExternalLink, User, Hammer, Building2 } from "lucide-react";
import type { CommunityProfile } from "@/hooks/useCommunityProfiles";

interface ProfileCardProps {
  profile: CommunityProfile;
}

const TYPE_CONFIG = {
  USER: { label: "User", icon: User, bg: "bg-accent-primary/15", text: "text-accent-primary" },
  BUILDER: { label: "Builder", icon: Hammer, bg: "bg-amber-500/15", text: "text-amber-500" },
  PROJECT: { label: "Project", icon: Building2, bg: "bg-accent-coral/15", text: "text-accent-coral" },
  // Legacy fallback
  PERSON: { label: "User", icon: User, bg: "bg-accent-primary/15", text: "text-accent-primary" },
} as const;

export function ProfileCard({ profile }: ProfileCardProps) {
  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const typeKey = (profile.type in TYPE_CONFIG ? profile.type : "USER") as keyof typeof TYPE_CONFIG;
  const typeConfig = TYPE_CONFIG[typeKey];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary transition-colors">
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden ${typeConfig.bg} ${typeConfig.text}`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate">
            {profile.displayName}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${typeConfig.bg} ${typeConfig.text}`}
          >
            <TypeIcon className="h-2.5 w-2.5" />
            {typeConfig.label}
          </span>
        </div>

        {profile.bio && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
            {profile.bio}
          </p>
        )}

        {profile.twitterHandle && (
          <a
            href={`https://x.com/intent/follow?screen_name=${profile.twitterHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow
            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
          </a>
        )}
      </div>
    </div>
  );
}
