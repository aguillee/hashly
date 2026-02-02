import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " UTC";
}

export function formatTimeRemaining(targetDate: Date | string): string {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return "Live Now!";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function truncateAddress(address: string): string {
  if (!address) return "";
  if (address.startsWith("0.0.")) {
    // Hedera account ID
    return address;
  }
  // ETH style address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getVoteScore(votesUp: number, votesDown: number): number {
  return votesUp - votesDown;
}

export function canVoteAgain(lastVoteDate: Date | string | null): boolean {
  if (!lastVoteDate) return true;
  const lastVote = new Date(lastVoteDate).getTime();
  const now = Date.now();
  const hoursSinceVote = (now - lastVote) / (1000 * 60 * 60);
  return hoursSinceVote >= 24;
}

// Parse mint price and determine if it's HBAR or USD
export function parseMintPrice(price: string): {
  value: string;
  currency: "HBAR" | "USD";
  isHbar: boolean;
} {
  const normalizedPrice = price.trim().toLowerCase();

  // Check if it's USD (starts with $ or contains usd/usdc/usdt)
  if (
    normalizedPrice.startsWith("$") ||
    normalizedPrice.includes("usd") ||
    normalizedPrice.includes("usdc") ||
    normalizedPrice.includes("usdt")
  ) {
    // Extract numeric value
    const numericValue = price.replace(/[^0-9.,]/g, "");
    return {
      value: numericValue || price,
      currency: "USD",
      isHbar: false,
    };
  }

  // Default to HBAR - extract numeric value
  const numericValue = price.replace(/[^0-9.,]/g, "");
  return {
    value: numericValue || price,
    currency: "HBAR",
    isHbar: true,
  };
}
