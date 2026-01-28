"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
  Plus,
  Trash2,
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

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  category: string;
  websiteUrl: string | null;
  twitterUrl: string | null;
  createdBy: {
    walletAddress: string;
  };
  createdAt: string;
}

interface Admin {
  id: string;
  walletAddress: string;
  createdAt: string;
  points: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [pendingEvents, setPendingEvents] = React.useState<PendingEvent[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingAdmins, setLoadingAdmins] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [newAdminWallet, setNewAdminWallet] = React.useState("");
  const [addingAdmin, setAddingAdmin] = React.useState(false);
  const [removingAdmin, setRemovingAdmin] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }

    fetchPendingEvents();
    fetchAdmins();
  }, [isConnected, user, router]);

  async function fetchPendingEvents() {
    try {
      const response = await fetch("/api/events/pending");
      if (response.ok) {
        const data = await response.json();
        setPendingEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch pending events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdmins() {
    try {
      const response = await fetch("/api/admin/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function handleAction(eventId: string, action: "approve" | "reject") {
    setProcessing(eventId);
    try {
      const response = await fetch("/api/events/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, action }),
      });

      if (response.ok) {
        setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch (error) {
      console.error(`Failed to ${action} event:`, error);
    } finally {
      setProcessing(null);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminWallet.trim()) return;

    setAddingAdmin(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: newAdminWallet.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setAdmins((prev) => [...prev, data.admin]);
        setNewAdminWallet("");
      } else {
        alert(data.error || "Failed to add admin");
      }
    } catch (error) {
      console.error("Failed to add admin:", error);
      alert("Failed to add admin");
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleRemoveAdmin(adminId: string) {
    if (!confirm("Are you sure you want to remove admin privileges from this user?")) {
      return;
    }

    setRemovingAdmin(adminId);
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== adminId));
      } else {
        alert(data.error || "Failed to remove admin");
      }
    } catch (error) {
      console.error("Failed to remove admin:", error);
      alert("Failed to remove admin");
    } finally {
      setRemovingAdmin(null);
    }
  }

  if (!isConnected || !user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-accent-primary/10">
          <Shield className="h-8 w-8 text-accent-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-text-secondary">Manage events and platform settings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEvents.length}</p>
                <p className="text-sm text-text-secondary">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/admin/events">
          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent-primary/10">
                  <Calendar className="h-6 w-6 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">All Events</p>
                  <p className="text-xs text-text-secondary">Manage published events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/events/new">
          <Card hover>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Create Event</p>
                  <p className="text-xs text-text-secondary">Add new event directly</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Pending Events - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Events ({pendingEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-bg-secondary animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : pendingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                  <p className="text-text-secondary">No pending events to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col lg:flex-row gap-4 p-4 bg-bg-secondary rounded-lg"
                    >
                      {/* Image */}
                      <div className="w-full lg:w-40 h-32 relative rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                        {event.imageUrl ? (
                          <Image
                            src={event.imageUrl}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-text-secondary" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <Badge variant="secondary">{event.category}</Badge>
                              <span>•</span>
                              <span>{formatDate(event.mintDate)}</span>
                              <span>•</span>
                              <span>{event.mintPrice}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                          {event.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                          <span>By: {event.createdBy.walletAddress}</span>
                          {event.websiteUrl && (
                            <a
                              href={event.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-accent-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Website
                            </a>
                          )}
                          {event.twitterUrl && (
                            <a
                              href={event.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-accent-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Twitter
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2 flex-shrink-0">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleAction(event.id, "approve")}
                          loading={processing === event.id}
                          className="flex-1 lg:flex-none gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleAction(event.id, "reject")}
                          loading={processing === event.id}
                          className="flex-1 lg:flex-none gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Management - 1 column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Admin Wallets ({admins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Admin Form */}
              <form onSubmit={handleAddAdmin} className="mb-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="0.0.XXXXX"
                    value={newAdminWallet}
                    onChange={(e) => setNewAdminWallet(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" loading={addingAdmin}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Admin List */}
              {loadingAdmins ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-12 bg-bg-secondary animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : admins.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No admins found</p>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm truncate">{admin.walletAddress}</p>
                        {admin.walletAddress === user?.walletAddress && (
                          <Badge variant="default" className="text-xs mt-1">You</Badge>
                        )}
                      </div>
                      {admin.walletAddress !== user?.walletAddress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.id)}
                          disabled={removingAdmin === admin.id}
                          className="text-error hover:text-error flex-shrink-0"
                        >
                          {removingAdmin === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
