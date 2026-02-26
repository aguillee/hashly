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
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary text-lg">
          Please connect your wallet to access the check-in panel.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">{error}</p>
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
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Event Check-in
        </h1>
        {eventTitle && (
          <p className="text-text-secondary text-lg">{eventTitle}</p>
        )}
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-10">
        <QRDisplay eventId={eventId} />
      </div>

      {/* Attendee list */}
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <AttendeeList eventId={eventId} />
      </div>
    </div>
  );
}
