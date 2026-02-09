"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Calendar, Trophy, Menu, X, Shield, Zap, Wallet, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/collections", label: "Collections", icon: Layers },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();
  const { user } = useWalletStore();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
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
              <span className="font-bold text-lg sm:text-xl gradient-text">Hashly</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 bg-bg-card/50 backdrop-blur-sm rounded-2xl p-1.5 border border-border">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-md"
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
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname.startsWith("/admin")
                    ? "bg-gradient-to-r from-accent-coral to-red-400 text-white shadow-md"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Points Badge (if connected) - hidden on mobile */}
            {user && (
              <Link
                href="/profile"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border hover:border-accent-primary/50 transition-all duration-200"
              >
                <Zap className="h-4 w-4 text-accent-primary" />
                <span className="font-semibold text-text-primary">
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
          <div className="md:hidden py-4 border-t border-border bg-bg-card/95 backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white"
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-gradient-to-r from-accent-coral to-red-400 text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                  )}
                >
                  <Shield className="h-5 w-5" />
                  Admin
                </Link>
              )}

              {/* Mobile-only: Points and Theme */}
              <div className="flex items-center justify-between px-4 pt-3 mt-1 border-t border-border">
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
                <div className="sm:hidden">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
