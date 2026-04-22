"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  X,
} from "lucide-react";
import {
  House,
  Newspaper,
  CalendarDots,
  Rocket,
  GlobeHemisphereWest,
  Ranking,
  Crosshair,
  Compass,
  Buildings,
  Lightning,
  CheckSquare,
  SidebarSimple,
  MoonStars,
  SunDim,
} from "@phosphor-icons/react";

import { useSidebarStore } from "@/store/sidebar";
import { useWalletStore } from "@/store";
import { useVoteLimit } from "@/lib/swr";
import { VoteLimitModal } from "@/components/votes/VoteLimitModal";
import { cn } from "@/lib/utils";

const ConnectButton = dynamic(
  () =>
    import("@/components/wallet/ConnectButton").then((m) => m.ConnectButton),
  { ssr: false }
);

const navLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/onboarding", label: "Get Started", icon: Compass },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/calendar", label: "Calendar", icon: CalendarDots },
  { href: "/projects", label: "Tokens", icon: Rocket },
  { href: "/ecosystem", label: "Ecosystem", icon: Buildings },
  { href: "/community", label: "HashWorld", icon: GlobeHemisphereWest },
  { href: "/leaderboard", label: "Leaderboard", icon: Ranking },
  { href: "/missions", label: "Missions", icon: Crosshair },
];

export function Sidebar() {
  const { isExpanded, isMobileOpen, toggle, closeMobile } = useSidebarStore();
  const [voteLimitModalOpen, setVoteLimitModalOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useWalletStore();
  const { data: voteLimit } = useVoteLimit();

  // Theme state
  const [isDark, setIsDark] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const show = isExpanded || isMobileOpen;

  // Close mobile sidebar on resize to desktop breakpoint
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) closeMobile();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeMobile]);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo — more breathing room (Arc style) */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 h-16 flex-shrink-0 group"
      >
        <Image
          src="/logo-navbar.png"
          alt="Hashly"
          width={40}
          height={40}
          className="w-9 h-9 flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
          priority
        />
        {show && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-[15px] leading-tight text-text-primary whitespace-nowrap tracking-tight">
              Hashly
            </span>
            <span className="text-[10px] text-text-tertiary font-medium tracking-[0.14em] uppercase whitespace-nowrap mt-0.5">
              Discover Hedera
            </span>
          </div>
        )}
      </Link>

      {/* Nav Links — Arc style: softer active state, inner tint, spring hover */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[13px] font-medium group relative",
                "transition-[color,background-color,box-shadow] duration-150 ease-out",
                active
                  ? "bg-brand/[0.08] text-text-primary shadow-[inset_0_1px_0_rgba(58,204,184,0.1)]"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r-full shadow-[0_0_8px_rgba(58,204,184,0.4)]" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  active ? "text-brand" : "group-hover:text-text-primary"
                )}
                weight={active ? "fill" : "regular"}
              />
              {show && (
                <span className="truncate tracking-tight">{link.label}</span>
              )}
            </Link>
          );
        })}

        {/* Admin link */}
        {user?.isAdmin && (
          <>
            <div className="my-2 mx-3 h-px bg-[var(--border-subtle)]" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[13px] font-medium relative",
                "transition-[color,background-color,box-shadow] duration-150 ease-out",
                pathname.startsWith("/admin")
                  ? "bg-brand/[0.08] text-text-primary shadow-[inset_0_1px_0_rgba(58,204,184,0.1)]"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70"
              )}
            >
              {pathname.startsWith("/admin") && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r-full shadow-[0_0_8px_rgba(58,204,184,0.4)]" />
              )}
              <Shield className="h-[18px] w-[18px] flex-shrink-0" />
              {show && <span className="tracking-tight">Admin</span>}
            </Link>
          </>
        )}
      </nav>

      {/* ─── Bottom section ─── */}
      <div className="border-t border-[var(--border-subtle)]">
        {/* User stats — only when connected */}
        {user && (
          <div className={cn("px-2 pt-3 pb-2", show ? "space-y-1.5" : "space-y-1.5")}>
            {/* Votes pill */}
            {voteLimit && (
              <button
                onClick={() => setVoteLimitModalOpen(true)}
                className={cn(
                  "w-full flex items-center rounded-lg transition-all duration-150 group",
                  show
                    ? "gap-2.5 px-2.5 py-2 bg-brand/8 border border-brand/15 hover:bg-brand/12 hover:border-brand/25"
                    : "justify-center p-2 hover:bg-brand/10"
                )}
                title={!show ? `${voteLimit.remaining}/${voteLimit.limit} votes` : undefined}
              >
                <div className="relative flex-shrink-0">
                  <CheckSquare className="h-4 w-4 text-brand transition-colors" weight="duotone" />
                  {voteLimit.remaining <= 1 && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                {show && (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-bold text-brand font-mono tabular-nums">
                      {voteLimit.remaining}
                    </span>
                    <span className="text-[10px] text-text-tertiary font-medium">/ {voteLimit.limit} votes</span>
                  </div>
                )}
                {show && (
                  <div className="flex-shrink-0 w-[42px] h-1.5 rounded-full bg-brand/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${(voteLimit.remaining / voteLimit.limit) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            )}

            {/* Points */}
            <Link
              href="/profile"
              className={cn(
                "w-full flex items-center rounded-lg transition-all duration-150 group",
                show
                  ? "gap-2.5 px-2.5 py-2 bg-amber-500/8 border border-amber-500/15 hover:bg-amber-500/12 hover:border-amber-500/25"
                  : "justify-center p-2 hover:bg-amber-500/10"
              )}
              title={!show ? `${(user.totalPoints ?? user.points ?? 0).toLocaleString()} pts` : undefined}
            >
              <Lightning className="h-4 w-4 text-amber-500 flex-shrink-0" weight="fill" />
              {show && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-bold text-amber-500 font-mono tabular-nums">
                    {(user.totalPoints ?? user.points ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-text-tertiary font-medium">pts</span>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Controls row: theme + collapse (or wallet when collapsed & not connected) */}
        <div className={cn(
          "px-2 pb-2 flex items-center",
          show ? "gap-1 pt-1" : "flex-col gap-1 pt-2"
        )}>
          {/* Theme toggle */}
          <button
            onClick={mounted ? toggleTheme : undefined}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-150",
              "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary",
              show ? "w-8 h-8" : "w-10 h-10"
            )}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mounted && isDark ? (
              <MoonStars className="h-4 w-4" weight="duotone" />
            ) : (
              <SunDim className="h-4 w-4 text-amber-500" weight="duotone" />
            )}
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggle}
            className={cn(
              "hidden lg:flex items-center justify-center rounded-lg transition-all duration-150",
              "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary",
              show ? "w-8 h-8 ml-auto" : "w-10 h-10"
            )}
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <SidebarSimple className="h-4 w-4" weight="duotone" />
          </button>
        </div>

        {/* Wallet */}
        <div className={cn("px-2 pb-3", show ? "" : "flex justify-center")}>
          <ConnectButton collapsed={!show} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — Arc-style: merges with content background, hairline right border */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 z-40 overflow-hidden",
          "bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]",
          "transition-[width] duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
          isExpanded ? "w-[232px]" : "w-14"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay + Drawer */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#05070A]/65 backdrop-blur-[6px] z-40 md:hidden animate-fade-in"
            onClick={closeMobile}
          />
          <aside
            className="fixed inset-y-0 left-0 w-72 bg-bg-card border-r border-[var(--border-subtle)] z-50 md:hidden shadow-[8px_0_32px_rgba(0,0,0,0.4)]"
            style={{ animation: "slideInLeft 0.25s cubic-bezier(0.25, 1, 0.5, 1)" }}
          >
            {/* Close button */}
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="absolute top-3 right-3 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors z-10 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Vote Limit Modal */}
      {voteLimit && (
        <VoteLimitModal
          open={voteLimitModalOpen}
          onClose={() => setVoteLimitModalOpen(false)}
          remaining={voteLimit.remaining}
          limit={voteLimit.limit}
          used={voteLimit.used}
          resetsAt={voteLimit.resetsAt}
          history={voteLimit.history || []}
        />
      )}

      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
