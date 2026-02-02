"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface Event {
  id: string;
  title: string;
  mintDate: string;
  mintPrice: string;
  category: string;
  status: "UPCOMING" | "LIVE";
  isApproved: boolean;
  votesUp: number;
  votesDown: number;
  imageUrl: string | null;
  createdBy: {
    walletAddress: string;
  };
  createdAt: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "approved" | "pending">("all");
  const [deleting, setDeleting] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }
    fetchEvents();
  }, [isConnected, user, router]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    setDeleting(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        alert("Failed to delete event");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleApproval(eventId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });

      if (response.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, isApproved: !currentStatus } : e
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle approval:", error);
    }
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && event.isApproved) ||
      (filter === "pending" && !event.isApproved);
    return matchesSearch && matchesFilter;
  });

  if (!isConnected || !user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Manage Events</h1>
          <p className="text-text-secondary">View, edit, and delete all events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "approved", "pending"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-text-secondary mb-4" />
              <p className="text-text-secondary">No events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg"
                >
                  {/* Image */}
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-text-secondary" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{event.title}</h3>
                      <Badge variant={event.isApproved ? "success" : "secondary"}>
                        {event.isApproved ? "Approved" : "Pending"}
                      </Badge>
                      <Badge variant="default" className="capitalize">
                        {event.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span>{formatDate(event.mintDate)}</span>
                      <span>{event.mintPrice}</span>
                      <span>Score: {event.votesUp - event.votesDown}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleApproval(event.id, event.isApproved)}
                      title={event.isApproved ? "Unapprove" : "Approve"}
                    >
                      {event.isApproved ? (
                        <XCircle className="h-4 w-4 text-error" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                    </Button>
                    <Link href={`/admin/events/${event.id}/edit`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/events/${event.id}`}>
                      <Button variant="ghost" size="sm" title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      disabled={deleting === event.id}
                      title="Delete"
                      className="text-error hover:text-error"
                    >
                      {deleting === event.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
