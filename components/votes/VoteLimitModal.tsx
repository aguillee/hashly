"use client";

import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Vote, Clock, ThumbsUp, ThumbsDown, Coins, Layers, Calendar } from "lucide-react";
import Image from "next/image";

interface VoteHistoryItem {
  type: "event" | "collection" | "token";
  id: string;
  name: string;
  imageUrl?: string | null;
  symbol?: string;
  eventType?: string;
  voteType?: string;
  voteWeight?: number;
  timestamp: string;
}

interface VoteLimitModalProps {
  open: boolean;
  onClose: () => void;
  remaining: number;
  limit: number;
  used: number;
  resetsAt: string;
  history: VoteHistoryItem[];
}

export function VoteLimitModal({
  open,
  onClose,
  remaining,
  limit,
  used,
  resetsAt,
  history,
}: VoteLimitModalProps) {
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const hoursUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const minutesUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60)) % 60);

  const getVoteIcon = (item: VoteHistoryItem) => {
    if (item.type === "event") {
      return <Calendar className="h-4 w-4 text-accent-primary" />;
    } else if (item.type === "collection") {
      return <Layers className="h-4 w-4 text-accent-purple" />;
    } else {
      return <Coins className="h-4 w-4 text-accent-coral" />;
    }
  };

  const getVoteDirection = (item: VoteHistoryItem) => {
    if (item.voteType) {
      return item.voteType === "UP" ? (
        <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
      );
    }
    if (item.voteWeight !== undefined) {
      return item.voteWeight > 0 ? (
        <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
      );
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-accent-coral" />
          Daily Vote Limit
        </div>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Status */}
        <div className={`p-4 rounded-lg border ${remaining === 0 ? "bg-red-500/10 border-red-500/30" : "bg-bg-secondary border-border"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Votes remaining today</span>
            <span className={`text-2xl font-bold ${remaining === 0 ? "text-red-500" : "text-text-primary"}`}>
              {remaining}/{limit}
            </span>
          </div>
          <div className="w-full bg-bg-card rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${remaining === 0 ? "bg-red-500" : "bg-accent-coral"}`}
              style={{ width: `${(remaining / limit) * 100}%` }}
            />
          </div>
        </div>

        {/* Reset time */}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="h-4 w-4" />
          <span>
            Resets in {hoursUntilReset}h {minutesUntilReset}m (at 00:00 UTC)
          </span>
        </div>

        {/* Explanation */}
        <div className="p-3 rounded-lg bg-bg-secondary/50 border border-border/50 space-y-2">
          <p className="text-sm text-text-secondary">
            Each wallet is limited to <strong className="text-text-primary">{limit} votes per day</strong> across all voteable content: NFT Mints, Forever Mints, Meetups, Hackathons, NFT Collections, and Tokens.
          </p>
          <p className="text-xs text-text-secondary/80">
            Every vote is recorded on-chain via Hedera Consensus Service (HCS), which incurs a transaction fee. This limit helps us maintain the platform&apos;s sustainability while preventing abuse.
          </p>
        </div>

        {/* Vote History */}
        {history.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2">Today&apos;s votes</h4>
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}-${index}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary/50"
                >
                  {/* Image */}
                  <div className="relative w-8 h-8 rounded-md overflow-hidden bg-bg-card flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getVoteIcon(item)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getVoteIcon(item)}
                      <span className="text-sm font-medium text-text-primary truncate">
                        {item.name}
                        {item.symbol && <span className="text-text-secondary"> ({item.symbol})</span>}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {formatTime(item.timestamp)}
                    </div>
                  </div>

                  {/* Vote direction */}
                  <div className="flex-shrink-0">
                    {getVoteDirection(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && used > 0 && (
          <p className="text-sm text-text-secondary text-center py-2">
            Vote history not available
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <Button onClick={onClose} className="w-full">
          OK
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
