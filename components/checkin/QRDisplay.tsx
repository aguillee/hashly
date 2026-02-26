"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, useCallback } from "react";

interface QRDisplayProps {
  eventId: string;
}

export default function QRDisplay({ eventId }: QRDisplayProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const fetchCode = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkin/${eventId}/code`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch code");
        return;
      }
      const data = await res.json();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      setError(null);
    } catch {
      setError("Connection error");
    }
  }, [eventId]);

  // Fetch code on mount and every 30s
  useEffect(() => {
    fetchCode();
    const interval = setInterval(fetchCode, 30_000);
    return () => clearInterval(interval);
  }, [fetchCode]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      if (expiresAt > 0) {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          fetchCode();
        }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt, fetchCode]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={fetchCode}
          className="text-accent-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qrUrl = `${baseUrl}/attend/${eventId}?code=${code}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={qrUrl}
          size={320}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-accent-primary"
              strokeDasharray={`${(timeLeft / 30) * 125.66} 125.66`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-text-primary">
            {timeLeft}
          </span>
        </div>
        <p className="text-text-secondary text-sm">
          QR refreshes in {timeLeft}s
        </p>
      </div>
    </div>
  );
}
