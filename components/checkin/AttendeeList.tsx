"use client";

import useSWR from "swr";

interface Attendee {
  walletAddress: string;
  createdAt: string;
  hcsMessageId: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AttendeeList({ eventId }: { eventId: string }) {
  const { data, isLoading } = useSWR<{ attendees: Attendee[]; total: number }>(
    `/api/checkin/${eventId}/attendees`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const attendees = data?.attendees || [];
  const total = data?.total || 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-semibold text-text-primary tracking-tight">
            Attendees
          </h3>
          <span className="inline-flex items-center px-2 h-[22px] rounded-[6px] bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold tabular-nums">
            {total}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[11px] text-text-tertiary font-medium">
            updates live
          </span>
        )}
      </div>

      {isLoading && attendees.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-[10px] bg-bg-secondary/40 border border-[var(--border-subtle)] animate-pulse"
            />
          ))}
        </div>
      ) : attendees.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-[12px] bg-bg-secondary/60 border border-[var(--card-border)] flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-text-tertiary animate-pulse" />
          </div>
          <p className="text-text-secondary text-sm">
            No check-ins yet. Share the QR with attendees.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto -mx-1 px-1">
          {attendees.map((a, i) => (
            <div
              key={a.walletAddress}
              className="flex items-center justify-between px-3 h-11 rounded-[10px] bg-bg-secondary/40 border border-[var(--border-subtle)] hover:border-[var(--card-border)] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-text-tertiary text-[11px] font-medium tabular-nums w-6 text-right flex-shrink-0">
                  {total - i}
                </span>
                <span className="text-text-primary text-[13px] tabular-nums truncate">
                  {a.walletAddress}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.hcsMessageId && (
                  <span
                    className="text-[10px] text-brand font-medium px-1.5 h-[18px] rounded-[4px] bg-brand/10 inline-flex items-center tabular-nums"
                    title="Recorded on-chain"
                  >
                    HCS #{a.hcsMessageId}
                  </span>
                )}
                <span className="text-[11px] text-text-tertiary tabular-nums">
                  {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
