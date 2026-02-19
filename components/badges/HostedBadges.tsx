"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Loader2,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface BadgeEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  mintDate: string | null;
  endDate: string | null;
  host: string | null;
  location: string | null;
  location_type: string | null;
}

interface HostedBadge {
  id: string;
  eventId: string;
  name: string;
  imageUrl: string | null;
  tokenId: string | null;
  status: "DRAFT" | "TOKEN_CREATED" | "MINTED" | "DISTRIBUTED";
  supply: number;
  createdAt: string;
  event: BadgeEvent | null;
  claimsCount: number;
}

interface HostRequest {
  id: string;
  eventId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  rejectedReason: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    imageUrl: string | null;
    mintDate: string | null;
  } | null;
}

export function HostedBadges() {
  const [badges, setBadges] = React.useState<HostedBadge[]>([]);
  const [requests, setRequests] = React.useState<HostRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [badgesRes, requestsRes] = await Promise.all([
        fetch("/api/badges"),
        fetch("/api/host-requests"),
      ]);

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges || []);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to load hosted badges:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: HostedBadge["status"]) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "TOKEN_CREATED":
        return <Badge variant="default">Token Created</Badge>;
      case "MINTED":
        return <Badge variant="coral">Minted</Badge>;
      case "DISTRIBUTED":
        return <Badge variant="success">Distributed</Badge>;
    }
  };

  const getRequestStatusBadge = (status: HostRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="error" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-8 rounded-lg bg-bg-card/50 border border-border text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary mx-auto mb-2" />
        <p className="text-text-secondary">Loading hosted events...</p>
      </div>
    );
  }

  const hasBadges = badges.length > 0;
  const hasPendingRequests = requests.some((r) => r.status === "PENDING");
  const hasContent = hasBadges || requests.length > 0;

  if (!hasContent) {
    return (
      <div className="p-8 rounded-lg bg-bg-card/50 border border-border text-center">
        <Award className="h-12 w-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary mb-2">No hosted events yet</p>
        <p className="text-sm text-text-secondary/70">
          Request to host an Ecosystem Meetup to create Attendance Badges for attendees
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {requests.filter((r) => r.status === "PENDING").length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">Pending Requests</h3>
          {requests
            .filter((r) => r.status === "PENDING")
            .map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-bg-card/50 border border-border"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {request.event?.imageUrl ? (
                    <Image
                      src={request.event.imageUrl}
                      alt={request.event.title || "Event"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-text-secondary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {request.event?.title || "Unknown Event"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Requested {formatDate(request.createdAt)}
                  </p>
                </div>
                {getRequestStatusBadge(request.status)}
              </div>
            ))}
        </div>
      )}

      {/* Active Badges */}
      {hasBadges && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">Your Badges</h3>
          {badges.map((badge) => (
            <Link
              key={badge.id}
              href={`/profile/badges/${badge.id}`}
              className="block"
            >
              <div className="flex items-center gap-4 p-4 rounded-lg bg-bg-card/50 border border-border hover:border-accent-primary/50 transition-all group">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                  {badge.imageUrl ? (
                    <Image
                      src={badge.imageUrl}
                      alt={badge.name}
                      fill
                      className="object-cover"
                    />
                  ) : badge.event?.imageUrl ? (
                    <Image
                      src={badge.event.imageUrl}
                      alt={badge.event.title || "Event"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Award className="h-7 w-7 text-accent-primary" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                    {badge.name}
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    {badge.event?.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {badge.event?.mintDate && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(badge.event.mintDate)}
                      </span>
                    )}
                    {badge.supply > 0 && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {badge.supply} minted
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(badge.status)}
                  <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Rejected Requests (collapsed) */}
      {requests.filter((r) => r.status === "REJECTED").length > 0 && (
        <details className="group">
          <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary">
            Rejected requests ({requests.filter((r) => r.status === "REJECTED").length})
          </summary>
          <div className="mt-3 space-y-2">
            {requests
              .filter((r) => r.status === "REJECTED")
              .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary/50 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary truncate">
                      {request.event?.title || "Unknown Event"}
                    </p>
                    {request.rejectedReason && (
                      <p className="text-xs text-error mt-1">{request.rejectedReason}</p>
                    )}
                  </div>
                  {getRequestStatusBadge(request.status)}
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
