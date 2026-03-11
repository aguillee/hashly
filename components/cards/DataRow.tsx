"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Crown, Medal, Award, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataRowProps {
  rank: number;
  name: string;
  image?: string | null;
  votes: number;
  subtitle?: string;
  href: string;
  external?: boolean;
  /** Optional accent for special items (e.g., amber for biggest prize) */
  accentBorder?: string;
  className?: string;
}

const rankIcons: Record<number, { icon: React.ElementType; color: string }> = {
  1: { icon: Crown, color: "text-amber-400" },
  2: { icon: Medal, color: "text-zinc-400" },
  3: { icon: Award, color: "text-orange-400" },
};

export function DataRow({
  rank,
  name,
  image,
  votes,
  subtitle,
  href,
  external,
  accentBorder,
  className,
}: DataRowProps) {
  const rankInfo = rankIcons[rank];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b border-border last:border-b-0 transition-colors duration-150",
        "hover:bg-bg-secondary/50 group -mx-2 px-2 rounded-md",
        accentBorder && `border-l-2 ${accentBorder} pl-3`,
        className
      )}
    >
      {/* Rank */}
      <div className="w-6 flex-shrink-0 text-center">
        {rankInfo ? (
          <rankInfo.icon className={cn("h-4 w-4 mx-auto", rankInfo.color)} />
        ) : (
          <span className="text-xs font-mono text-text-tertiary">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-md overflow-hidden bg-bg-secondary flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="h-3.5 w-3.5 text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand transition-colors duration-150">
          {name}
        </p>
        {subtitle && (
          <p className="text-[10px] text-text-tertiary truncate">{subtitle}</p>
        )}
      </div>

      {/* Votes */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <TrendingUp className="h-3 w-3 text-green-500" />
        <span className="text-xs font-bold font-mono text-green-500">
          {votes > 0 ? `+${votes}` : votes}
        </span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export function DataRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <div className="w-6 h-4 skeleton rounded" />
      <div className="w-8 h-8 rounded-md skeleton" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-2/3 skeleton rounded" />
        <div className="h-2.5 w-1/3 skeleton rounded" />
      </div>
      <div className="h-3 w-10 skeleton rounded" />
    </div>
  );
}
