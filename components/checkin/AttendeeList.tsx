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
        <h3 className="text-lg font-semibold text-text-primary">
          Attendees
        </h3>
        <span className="bg-brand-subtle text-brand px-3 py-1 rounded-full text-sm font-medium">
          {total}
        </span>
      </div>

      {isLoading && attendees.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : attendees.length === 0 ? (
        <p className="text-text-tertiary text-center py-8">
          No check-ins yet. Share the QR code with attendees.
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {attendees.map((a, i) => (
            <div
              key={a.walletAddress}
              className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-text-tertiary text-xs font-mono w-6 text-right">
                  {total - i}
                </span>
                <span className="text-text-primary font-mono text-sm">
                  {a.walletAddress}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {a.hcsMessageId && (
                  <span className="text-xs text-brand" title="Recorded on-chain">
                    HCS #{a.hcsMessageId}
                  </span>
                )}
                <span className="text-xs text-text-tertiary">
                  {new Date(a.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
