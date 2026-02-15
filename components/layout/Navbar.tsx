"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Calendar, Trophy, Menu, X, Shield, Zap, Wallet, Layers, Newspaper, Vote } from "lucide-react";
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
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [voteLimitModalOpen, setVoteLimitModalOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useWalletStore();
  const { data: voteLimit } = useVoteLimit();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isOutOfVotes = voteLimit?.remaining === 0;

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-bg-card/80 backdrop-blur-xl shadow-lg border-b border-border"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20 py-2 sm:py-3 lg:py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <Image
                src="/logo-navbar.png"
                alt="Hashly"
                width={40}
                height={40}
                className="group-hover:scale-105 transition-transform duration-300 w-9 h-9 sm:w-12 sm:h-12"
                priority
              />
              <div className="hidden xs:block">
                <span className="font-bold text-lg sm:text-xl text-text-primary">Hashly</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 bg-bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-accent-primary text-white"
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
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-accent-coral text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Votes Remaining Badge (if connected) - hidden on mobile */}
              {user && voteLimit && (
                <button
                  onClick={() => setVoteLimitModalOpen(true)}
                  className={cn(
                    "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-200 cursor-pointer",
                    isOutOfVotes
                      ? "bg-red-500/10 border-red-500/50 hover:bg-red-500/20"
                      : "bg-bg-card border-border hover:border-accent-coral/50"
                  )}
                  title="Click to see vote limit details"
                >
                  <Vote className={cn("h-4 w-4", isOutOfVotes ? "text-red-500" : "text-accent-coral")} />
                  <span className={cn("font-semibold text-sm", isOutOfVotes ? "text-red-500" : "text-text-primary")}>
                    {voteLimit.remaining}/{voteLimit.limit}
                  </span>
                </button>
              )}

              {/* Points Badge (if connected) - hidden on mobile */}
              {user && (
                <Link
                  href="/profile"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-card border border-border hover:border-accent-primary/50 transition-all duration-200"
                >
                  <Zap className="h-4 w-4 text-accent-primary" />
                  <span className="font-semibold text-text-primary text-sm">
                    {(user.points ?? 0).toLocaleString()}
                  </span>
                </Link>
              )}

              {/* Theme toggle - hidden on small mobile, shown in mobile menu instead */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <ConnectButton />

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-border bg-bg-card/95 backdrop-blur-xl animate-fade-in">
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
                        "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200",
                        isActive
                          ? "bg-accent-primary text-white"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}

                {user?.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200",
                      pathname.startsWith("/admin")
                        ? "bg-accent-coral text-white"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    Admin
                  </Link>
                )}

                {/* Mobile-only: Votes, Points and Theme */}
                <div className="flex items-center justify-between px-4 pt-3 mt-2 border-t border-dashed border-border/50">
                  <div className="flex items-center gap-4">
                    {user && voteLimit && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setVoteLimitModalOpen(true);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 text-sm",
                          isOutOfVotes ? "text-red-500" : "text-text-secondary"
                        )}
                      >
                        <Vote className={cn("h-4 w-4", isOutOfVotes ? "text-red-500" : "text-accent-coral")} />
                        <span className={cn("font-semibold", isOutOfVotes ? "text-red-500" : "text-text-primary")}>
                          {voteLimit.remaining}/{voteLimit.limit}
                        </span>
                      </button>
                    )}
                    {user && (
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-sm text-text-secondary"
                      >
                        <Zap className="h-4 w-4 text-accent-primary" />
                        <span className="font-semibold text-text-primary">
                          {(user.points ?? 0).toLocaleString()} pts
                        </span>
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
