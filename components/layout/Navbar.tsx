"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Calendar, Trophy, Menu, X, Shield, Zap, Wallet, Layers, Newspaper, Vote, Globe } from "lucide-react";
import { useVoteLimit } from "@/lib/swr";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { VoteLimitModal } from "@/components/votes/VoteLimitModal";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";

// Dynamic import to avoid SSR issues with wallet SDK
const ConnectButton = dynamic(
  () => import("@/components/wallet/ConnectButton").then((mod) => mod.ConnectButton),
  {
    ssr: false,
    loading: () => (
      <Button className="gap-2" disabled>
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    ),
  }
);

const navLinks = [
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/community", label: "HashWorld", icon: Globe },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [voteLimitModalOpen, setVoteLimitModalOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useWalletStore();
  const { data: voteLimit } = useVoteLimit();

  const isOutOfVotes = voteLimit?.remaining === 0;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-bg-card border-b border-border">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
                <Image
                  src="/logo-navbar.png"
                  alt="Hashly"
                  width={36}
                  height={36}
                  className="w-8 h-8 sm:w-9 sm:h-9"
                  priority
                />
                <div className="hidden sm:flex flex-col">
                  <span className="font-bold text-lg leading-none text-text-primary">Hashly</span>
                  <span className="text-[9px] text-text-secondary font-medium tracking-wider uppercase">Discover Hedera</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "text-white bg-accent-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}

                {/* Admin link */}
                {user?.isAdmin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      pathname.startsWith("/admin")
                        ? "text-white bg-accent-coral"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Votes Remaining Badge */}
                {user && voteLimit && (
                  <button
                    onClick={() => setVoteLimitModalOpen(true)}
                    className={cn(
                      "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                      isOutOfVotes
                        ? "text-text-secondary bg-bg-secondary"
                        : "text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20"
                    )}
                    title="Click to see vote limit details"
                  >
                    <Vote className="h-3.5 w-3.5" />
                    <span className="tabular-nums">
                      {voteLimit.remaining}/{voteLimit.limit}
                    </span>
                  </button>
                )}

                {/* Points Badge */}
                {user && (
                  <Link
                    href="/profile"
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="tabular-nums">
                      {(user.totalPoints ?? user.points ?? 0).toLocaleString()}
                    </span>
                  </Link>
                )}

                {/* Separator */}
                {user && <div className="hidden md:block w-px h-5 bg-border mx-1" />}

                {/* Theme toggle */}
                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>
                <ConnectButton />

                {/* Mobile menu button */}
                <button
                  className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden pb-4 pt-2 border-t border-border">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "text-white bg-accent-primary"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {link.label}
                      </Link>
                    );
                  })}

                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith("/admin")
                          ? "text-white bg-accent-coral"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      )}
                    >
                      <Shield className="h-[18px] w-[18px]" />
                      Admin
                    </Link>
                  )}

                  {/* Mobile-only: Votes, Points and Theme */}
                  <div className="flex items-center justify-between px-4 pt-3 mt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      {user && voteLimit && (
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setVoteLimitModalOpen(true);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold",
                            isOutOfVotes
                              ? "text-text-secondary"
                              : "text-accent-primary bg-accent-primary/10"
                          )}
                        >
                          <Vote className="h-4 w-4" />
                          <span>{voteLimit.remaining}/{voteLimit.limit}</span>
                        </button>
                      )}
                      {user && (
                        <Link
                          href="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold text-amber-500 bg-amber-500/10"
                        >
                          <Zap className="h-4 w-4" />
                          <span>{(user.totalPoints ?? user.points ?? 0).toLocaleString()} pts</span>
                        </Link>
                      )}
                    </div>
                    <div className="sm:hidden">
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

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
    </>
  );
}
