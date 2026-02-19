"use client";

import * as React from "react";
import { Wallet, ChevronDown, LogOut, User, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWallet } from "./WalletProvider";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function ConnectButton() {
  const { connect, disconnect, isConnecting } = useWallet();
  const { isConnected, user } = useWalletStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error: any) {
      console.error("Connection error:", error);
      // User closed modal - don't show error
      const message = error?.message || "";
      if (message.includes("User closed") || message.includes("rejected") || message.includes("cancelled")) {
        return;
      }
      // Show user-friendly error for actual errors
      if (message.includes("Subscribing") || message.includes("failed") || message.includes("timeout")) {
        alert("Connection failed. Please refresh the page and try again.");
      }
    }
  };

  // Truncate wallet for mobile: "0.0.10117827" -> "0.0...7827"
  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 3)}...${addr.slice(-4)}`;
  };

  if (!isConnected || !user) {
    return (
      <Button
        onClick={handleConnect}
        loading={isConnecting}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="secondary"
        className="gap-1.5 sm:gap-2 px-2.5 sm:px-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="hidden sm:inline">{user.walletAddress}</span>
        <span className="sm:hidden text-xs">{truncateAddress(user.walletAddress)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-secondary transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50 min-w-[200px] overflow-hidden rounded-lg border border-border bg-bg-card p-1 shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-text-primary">{user.walletAddress}</p>
            <p className="text-xs text-text-secondary">
              {(user.totalPoints ?? user.points).toLocaleString()} pts • {user.loginStreak} day streak
            </p>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>

          <Link
            href="/missions"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            )}
          >
            <Trophy className="h-4 w-4" />
            Missions
          </Link>

          <div className="my-1 h-px bg-border" />

          <button
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              "text-error hover:bg-error/10"
            )}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
