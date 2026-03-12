"use client";

import * as React from "react";
import { Wallet, CaretDown, SignOut, UserCircle, Crosshair } from "@phosphor-icons/react";
import { useWallet } from "./WalletProvider";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ConnectButtonProps {
  collapsed?: boolean;
}

export function ConnectButton({ collapsed }: ConnectButtonProps) {
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
      const message = error?.message || "";
      if (message.includes("User closed") || message.includes("rejected") || message.includes("cancelled")) {
        return;
      }
      if (message.includes("Subscribing") || message.includes("failed") || message.includes("timeout")) {
        alert("Connection failed. Please refresh the page and try again.");
      }
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 3)}...${addr.slice(-4)}`;
  };

  if (!isConnected || !user) {
    if (collapsed) {
      return (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 mx-auto",
            "bg-brand text-white hover:bg-brand/90 active:scale-95 shadow-[0_0_12px_rgba(20,184,166,0.3)] hover:shadow-[0_0_20px_rgba(20,184,166,0.45)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Connect Wallet"
        >
          <Wallet className="h-4 w-4" weight="fill" />
        </button>
      );
    }

    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={cn(
          "flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
          "bg-brand text-white hover:bg-brand/90 active:scale-[0.97] shadow-[0_0_12px_rgba(20,184,166,0.3)] hover:shadow-[0_0_20px_rgba(20,184,166,0.45)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Wallet className="h-4 w-4 flex-shrink-0" weight="fill" />
        {isConnecting ? (
          <span className="text-xs">Connecting...</span>
        ) : (
          <span className="text-xs">Connect</span>
        )}
      </button>
    );
  }

  // Connected state — collapsed: just icon
  if (collapsed) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 mx-auto",
            "text-brand bg-brand/5 hover:bg-brand/10",
            isOpen && "bg-brand/10"
          )}
          onClick={() => setIsOpen(!isOpen)}
          title={user.walletAddress}
        >
          <Wallet className="h-4 w-4" weight="duotone" />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute left-full bottom-0 ml-2 z-50 min-w-[220px] overflow-hidden rounded-xl border border-border bg-bg-card p-1 shadow-lg",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-mono text-text-primary">{user.walletAddress}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                {(user.totalPoints ?? user.points).toLocaleString()} pts
              </p>
            </div>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            >
              <UserCircle className="h-4 w-4" weight="duotone" />
              Profile
            </Link>

            <div className="my-1 h-px bg-border" />

            <button
              onClick={() => { disconnect(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
            >
              <SignOut className="h-4 w-4" weight="duotone" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Connected state — expanded
  return (
    <div className="relative" ref={menuRef}>
      <button
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150",
          "bg-brand/5 text-text-secondary hover:bg-brand/10 hover:text-text-primary",
          isOpen && "bg-brand/10 text-text-primary"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Wallet className="h-4 w-4 flex-shrink-0 text-brand" weight="duotone" />
        <span className="truncate text-xs font-mono">{truncateAddress(user.walletAddress)}</span>
        <CaretDown className={cn("h-3 w-3 text-text-tertiary transition-transform ml-auto flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 bottom-full mb-2 z-50 min-w-[220px] overflow-hidden rounded-xl border border-border bg-bg-card p-1 shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-mono text-text-primary">{user.walletAddress}</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">
              {(user.totalPoints ?? user.points).toLocaleString()} pts
            </p>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          >
            <UserCircle className="h-4 w-4" weight="duotone" />
            Profile
          </Link>

          <Link
            href="/missions"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          >
            <Crosshair className="h-4 w-4" weight="duotone" />
            Missions
          </Link>

          <div className="my-1 h-px bg-border" />

          <button
            onClick={() => { disconnect(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
          >
            <SignOut className="h-4 w-4" weight="duotone" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
