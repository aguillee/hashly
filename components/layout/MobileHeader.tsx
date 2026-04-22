"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar";

export function MobileHeader() {
  const { openMobile } = useSidebarStore();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 bg-[rgba(var(--bg-card-rgb),0.75)] backdrop-blur-md border-b border-[var(--border-subtle)] md:hidden">
      <button
        onClick={openMobile}
        className="p-2 -ml-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/" className="flex items-center gap-2 group">
        <Image
          src="/logo-navbar.png"
          alt="Hashly"
          width={36}
          height={36}
          className="w-9 h-9 transition-transform duration-300 group-hover:scale-105"
        />
        <span className="font-semibold text-[15px] text-text-primary tracking-tight">Hashly</span>
      </Link>
      <div className="w-9" aria-hidden="true" />
    </div>
  );
}
