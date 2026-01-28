"use client";

import { cn } from "@/lib/utils";

interface HbarIconProps {
  className?: string;
}

export function HbarIcon({ className }: HbarIconProps) {
  return (
    <img
      src="/hbar-logo.png"
      alt="HBAR"
      className={cn("h-4 w-4 rounded-full", className)}
    />
  );
}
