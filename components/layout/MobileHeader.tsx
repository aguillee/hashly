"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar";

export function MobileHeader() {
  const { openMobile } = useSidebarStore();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-bg-card/80 backdrop-blur-md border-b border-border md:hidden">
      <button
        onClick={openMobile}
        className="p-2 -ml-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo-navbar.png" alt="Hashly" width={36} height={36} className="w-9 h-9" />
        <span className="font-semibold text-sm text-text-primary">Hashly</span>
      </Link>
      <div className="w-9" /> {/* Spacer for centering */}
    </div>
  );
}
