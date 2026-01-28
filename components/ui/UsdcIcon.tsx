"use client";

import { cn } from "@/lib/utils";

interface UsdcIconProps {
  className?: string;
}

export function UsdcIcon({ className }: UsdcIconProps) {
  return (
    <img
      src="/usdc-logo.png"
      alt="USDC"
      className={cn("h-4 w-4 rounded-full", className)}
    />
  );
}
