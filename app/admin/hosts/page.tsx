"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mic2,
  Loader2,
  Calendar,
  Check,
  X,
  Clock,
  User,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/store";

interface HostRequest {
  id: string;
  walletAddress: string;
  eventId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  rejectedReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  event: {
    id: string;
    title: string;
    imageUrl: string | null;
    mintDate: string | null;
    event_type: string;
    host: string | null;
  } | null;
  user: {
    walletAddress: string;
    alias: string | null;
  } | null;
}

export default function AdminHostsPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [requests, setRequests] = React.useState<HostRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [showRejectModal, setShowRejectModal] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }
    loadRequests();
  }, [isConnected, user, filter]);

  async function loadRequests() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/host-requests?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to load host requests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/admin/host-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        loadRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve");
      }
    } catch (error) {
      alert("Failed to approve");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(requestId: string) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/admin/host-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectedReason: rejectReason || undefined,
        }),
      });

      if (res.ok) {
        setShowRejectModal(null);
        setRejectReason("");
        loadRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject");
      }
    } catch (error) {
      alert("Failed to reject");
    } finally {
      setProcessing(null);
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 8)}...${wallet.slice(-4)}`;
  };

  if (!isConnected || !user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Mic2 className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Host Requests</h1>
              <p className="text-sm text-text-secondary">
                Manage host requests for Attendance Badges
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="appearance-none px-4 py-2 pr-10 rounded-lg bg-bg-card border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <Mic2 className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">No {filter.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-6 rounded-lg bg-bg-card border border-border"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Event Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                      {request.event?.imageUrl ? (
                        <Image
                          src={request.event.imageUrl}
                          alt={request.event.title || "Event"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-text-secondary" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary">
                        {request.event?.title || "Unknown Event"}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.event?.mintDate || null)}
                        </span>
                        {request.event?.host && (
                          <span>Current host: {request.event.host}</span>
                        )}
                      </div>

                      {/* Requester */}
                      <div className="mt-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm text-text-secondary">
                          Requested by:{" "}
                          <span className="text-text-primary">
                            {request.user?.alias || formatWallet(request.walletAddress)}
                          </span>
                        </span>
                      </div>

                      {request.message && (
                        <p className="mt-2 text-sm text-text-secondary bg-bg-secondary/50 p-2 rounded">
                          &quot;{request.message}&quot;
                        </p>
                      )}

                      <p className="mt-2 text-xs text-text-secondary">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Requested {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {request.status === "PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRejectModal(request.id)}
                          disabled={processing === request.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={request.status === "APPROVED" ? "success" : "error"}
                      >
                        {request.status}
                      </Badge>
                    )}

                    <a
                      href={`/events/${request.eventId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {request.status === "REJECTED" && request.rejectedReason && (
                  <div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/20">
                    <p className="text-sm text-error">
                      Reason: {request.rejectedReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRejectModal(null)}
            />
            <div className="relative z-10 bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Reject Host Request
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter a reason for rejection..."
                  className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processing === showRejectModal}
                  className="bg-error hover:bg-error/90"
                >
                  {processing === showRejectModal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reject"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
