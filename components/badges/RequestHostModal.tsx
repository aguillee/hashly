"use client";

import * as React from "react";
import { Mic2, Loader2, X, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RequestHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onSuccess: () => void;
}

export function RequestHostModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSuccess,
}: RequestHostModalProps) {
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/host-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, message: message.trim() || null }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          setSuccess(false);
          setMessage("");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit request");
      }
    } catch (err) {
      setError("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-bg-card border border-border rounded-t-xl sm:rounded-xl p-6 w-full sm:max-w-md mx-0 sm:mx-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Mic2 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Request to Host</h3>
            <p className="text-sm text-text-secondary">
              Attendance Badge for this event
            </p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h4 className="text-lg font-semibold text-text-primary mb-1">
              Request Submitted!
            </h4>
            <p className="text-sm text-text-secondary">
              An admin will review your request soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-text-secondary mb-4">
              Request to become the host of{" "}
              <span className="font-semibold text-text-primary">{eventTitle}</span>
              . Once approved, you can create and distribute Attendance Badges to attendees.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell us why you should be the host..."
                className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
              />
              <p className="text-xs text-text-secondary mt-1 text-right">
                {message.length}/500
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
