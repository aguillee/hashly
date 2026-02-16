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
      return <Calendar className="h-3 w-3 text-accent-primary" />;
    } else if (item.type === "collection") {
      return <Layers className="h-3 w-3 text-accent-purple" />;
    } else {
      return <Coins className="h-3 w-3 text-accent-coral" />;
    }
  };

  const getVoteDirection = (item: VoteHistoryItem) => {
    if (item.voteType) {
      return item.voteType === "UP" ? (
        <ThumbsUp className="h-3 w-3 text-green-500" />
      ) : (
        <ThumbsDown className="h-3 w-3 text-red-500" />
      );
    }
    if (item.voteWeight !== undefined) {
      return item.voteWeight > 0 ? (
        <ThumbsUp className="h-3 w-3 text-green-500" />
      ) : (
        <ThumbsDown className="h-3 w-3 text-red-500" />
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

      <DialogBody className="space-y-3">
        {/* Status - Compact */}
        <div className={`p-3 rounded-lg border ${remaining === 0 ? "bg-red-500/10 border-red-500/30" : "bg-bg-secondary border-border"}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs">Remaining</span>
            <span className={`text-lg font-bold ${remaining === 0 ? "text-red-500" : "text-text-primary"}`}>
              {remaining}/{limit}
            </span>
          </div>
          <div className="w-full bg-bg-card rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${remaining === 0 ? "bg-red-500" : "bg-accent-coral"}`}
              style={{ width: `${(remaining / limit) * 100}%` }}
            />
          </div>
          {/* Reset time inline */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-secondary">
            <Clock className="h-3 w-3" />
            <span>Resets in {hoursUntilReset}h {minutesUntilReset}m</span>
          </div>
        </div>

        {/* Explanation - More compact */}
        <p className="text-xs text-text-secondary leading-relaxed">
          Limited to <strong className="text-text-primary">{limit} votes/day</strong> across all content. Each vote is recorded on-chain (HCS) to ensure transparency and sustainability.
        </p>

        {/* Vote History - Compact */}
        {history.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-text-secondary mb-1.5">Today&apos;s votes</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}-${index}`}
                  className="flex items-center gap-2 p-1.5 rounded bg-bg-secondary/50"
                >
                  {/* Image */}
                  <div className="relative w-6 h-6 rounded overflow-hidden bg-bg-card flex-shrink-0">
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
                    <span className="text-xs font-medium text-text-primary truncate block">
                      {item.name}
                    </span>
                  </div>

                  {/* Vote direction & time */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-text-secondary">{formatTime(item.timestamp)}</span>
                    {getVoteDirection(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="p-3 pt-0 border-t-0">
        <Button onClick={onClose} size="sm" className="w-full">
          OK
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
