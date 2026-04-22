"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWalletStore } from "@/store";
import dynamic from "next/dynamic";
import AttendeeList from "@/components/checkin/AttendeeList";

const QRDisplay = dynamic(() => import("@/components/checkin/QRDisplay"), {
  ssr: false,
});

export default function CheckinHostPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { isConnected, user } = useWalletStore();
  const [eventTitle, setEventTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !eventId) return;

    async function checkAccess() {
      try {
        const res = await fetch(`/api/checkin/${eventId}/code`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Access denied");
          return;
        }
        const data = await res.json();
        setEventTitle(data.eventTitle || "");
      } catch {
        setError("Failed to connect");
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [isConnected, eventId]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-bg-secondary border border-[var(--card-border)] flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-text-tertiary" />
          </div>
          <p className="text-text-primary text-base font-medium mb-1">Wallet not connected</p>
          <p className="text-text-secondary text-sm">
            Please connect your wallet to access the check-in panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
        <div className="h-10 w-64 mx-auto rounded-[8px] bg-bg-card border border-[var(--card-border)] animate-pulse mb-3" />
        <div className="h-5 w-48 mx-auto rounded-[6px] bg-bg-card/60 animate-pulse mb-10" />
        <div className="w-72 h-72 mx-auto rounded-[16px] bg-bg-card border border-[var(--card-border)] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-error/10 border border-error/20 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-error" />
          </div>
          <p className="text-error text-base font-medium mb-1">{error}</p>
          <p className="text-text-tertiary text-sm">
            Only the event creator or admins can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
          Attendance check-in
        </p>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1] mb-2">
          Scan to join
        </h1>
        {eventTitle && (
          <p className="text-text-secondary text-base">{eventTitle}</p>
        )}
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-10">
        <QRDisplay eventId={eventId} />
      </div>

      {/* Attendee list */}
      <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card p-5 sm:p-6">
        <AttendeeList eventId={eventId} />
      </div>
    </div>
  );
}
