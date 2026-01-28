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
      // Show user-friendly error message
      const message = error?.message || "Connection failed";
      if (message.includes("Subscribing") || message.includes("failed")) {
        alert("Unable to connect to wallet. Please try again in a few moments.");
      }
    }
  };

  if (!isConnected || !user) {
    return (
      <Button
        onClick={handleConnect}
        loading={isConnecting}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="secondary"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{user.walletAddress}</span>
        <ChevronDown className={cn("h-4 w-4 text-text-secondary transition-transform", isOpen && "rotate-180")} />
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
              {user.points.toLocaleString()} pts • {user.loginStreak} day streak
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
