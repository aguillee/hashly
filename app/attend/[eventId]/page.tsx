"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletStore } from "@/store";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error" | "already" | "expired" | "no-code";

export default function AttendPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const { connect, isConnecting } = useWallet();
  const { isConnected, walletAddress } = useWalletStore();

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [connectError, setConnectError] = useState("");

  // No code = no access
  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Access Denied
          </h1>
          <p className="text-text-secondary">
            This page can only be accessed by scanning the event QR code.
          </p>
        </div>
      </div>
    );
  }

  async function handleCheckin() {
    if (!walletAddress || !code) return;

    setStatus("loading");
    try {
      const res = await fetch(`/api/checkin/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, walletAddress }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setEventTitle(data.eventTitle || "");
        setMessage(data.hcsMessageId ? `On-chain record: HCS #${data.hcsMessageId}` : "");
      } else if (res.status === 409) {
        setStatus("already");
      } else if (res.status === 403) {
        setStatus("expired");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Connection failed. Please try again.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          {/* Success */}
          {status === "success" && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                You're checked in!
              </h1>
              {eventTitle && (
                <p className="text-text-secondary mb-2">{eventTitle}</p>
              )}
              <p className="text-sm text-text-tertiary font-mono">
                {walletAddress}
              </p>
              {message && (
                <p className="text-xs text-accent-primary mt-3">{message}</p>
              )}
            </>
          )}

          {/* Already checked in */}
          {status === "already" && (
            <>
              <div className="text-6xl mb-4">👋</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Already checked in
              </h1>
              <p className="text-text-secondary">
                Your wallet is already registered for this event.
              </p>
              <p className="text-sm text-text-tertiary font-mono mt-3">
                {walletAddress}
              </p>
            </>
          )}

          {/* Expired code */}
          {status === "expired" && (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Code Expired
              </h1>
              <p className="text-text-secondary">
                Please scan the QR code again to get a fresh code.
              </p>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Check-in Failed
              </h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <Button onClick={handleCheckin} variant="outline" size="lg">
                Try Again
              </Button>
            </>
          )}

          {/* Idle / Loading - main flow */}
          {(status === "idle" || status === "loading") && (
            <>
              <div className="text-5xl mb-4">📍</div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Event Check-in
              </h1>
              <p className="text-text-secondary mb-6">
                Confirm your attendance by connecting your wallet.
              </p>

              {!isConnected ? (
                <div className="space-y-3">
                  <Button
                    onClick={async () => {
                      setConnectError("");
                      try {
                        await connect();
                      } catch (err: any) {
                        console.error("Connect wallet error:", err);
                        const msg = err?.message || "";
                        if (msg.includes("not initialized") || msg.includes("connector")) {
                          setConnectError(
                            "Wallet service is loading. Please wait a moment and try again."
                          );
                        } else if (msg.includes("User rejected") || msg.includes("dismissed")) {
                          setConnectError("Connection was cancelled. Try again when ready.");
                        } else {
                          setConnectError(
                            msg || "Could not connect wallet. Please try again."
                          );
                        }
                      }
                    }}
                    loading={isConnecting}
                    size="xl"
                    className="w-full"
                  >
                    Connect Wallet
                  </Button>
                  {connectError && (
                    <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                      {connectError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-text-tertiary font-mono">
                    {walletAddress}
                  </p>
                  <Button
                    onClick={handleCheckin}
                    loading={status === "loading"}
                    size="xl"
                    className="w-full"
                  >
                    Confirm Attendance
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
