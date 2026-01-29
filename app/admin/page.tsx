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
  RefreshCw,
  Layers,
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

interface PendingCollection {
  id: string;
  tokenAddress: string;
  name: string;
  description: string | null;
  image: string | null;
  supply: number;
  submittedBy: string | null;
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
  const [pendingCollections, setPendingCollections] = React.useState<PendingCollection[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingAdmins, setLoadingAdmins] = React.useState(true);
  const [loadingCollections, setLoadingCollections] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [processingCollection, setProcessingCollection] = React.useState<string | null>(null);
  const [newAdminWallet, setNewAdminWallet] = React.useState("");
  const [addingAdmin, setAddingAdmin] = React.useState(false);
  const [removingAdmin, setRemovingAdmin] = React.useState<string | null>(null);
  const [syncingLaunchpads, setSyncingLaunchpads] = React.useState(false);
  const [syncingKabila, setSyncingKabila] = React.useState(false);
  const [syncingCollections, setSyncingCollections] = React.useState(false);
  const [deletingCollections, setDeletingCollections] = React.useState(false);
  const [cleaningUp, setCleaningUp] = React.useState(false);
  const [addingCollection, setAddingCollection] = React.useState(false);
  const [newCollectionTokenId, setNewCollectionTokenId] = React.useState("");
  const [syncResult, setSyncResult] = React.useState<{
    type: "launchpads" | "kabila" | "collections" | "cleanup" | "delete-collections" | "add-collection";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }

    fetchPendingEvents();
    fetchPendingCollections();
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

  async function fetchPendingCollections() {
    try {
      const response = await fetch("/api/admin/collections/pending");
      if (response.ok) {
        const data = await response.json();
        setPendingCollections(data.collections);
      }
    } catch (error) {
      console.error("Failed to fetch pending collections:", error);
    } finally {
      setLoadingCollections(false);
    }
  }

  async function handleCollectionAction(collectionId: string, action: "approve" | "reject") {
    setProcessingCollection(collectionId);
    try {
      const response = await fetch("/api/admin/collections/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, action }),
      });

      if (response.ok) {
        setPendingCollections((prev) => prev.filter((c) => c.id !== collectionId));
      }
    } catch (error) {
      console.error(`Failed to ${action} collection:`, error);
    } finally {
      setProcessingCollection(null);
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

  async function handleSyncLaunchpads() {
    setSyncingLaunchpads(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "launchpads",
          message: data.message || `Imported ${data.created} events`,
        });
        // Refresh pending events
        fetchPendingEvents();
      } else {
        setSyncResult({
          type: "launchpads",
          message: data.error || "Sync failed",
        });
      }
    } catch (error) {
      console.error("Failed to sync launchpads:", error);
      setSyncResult({
        type: "launchpads",
        message: "Failed to sync launchpads",
      });
    } finally {
      setSyncingLaunchpads(false);
    }
  }

  async function handleSyncKabila() {
    setSyncingKabila(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/sync/kabila", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "kabila",
          message: data.message || `Kabila: Imported ${data.created} events`,
        });
        // Refresh pending events
        fetchPendingEvents();
      } else {
        setSyncResult({
          type: "kabila",
          message: data.error || "Kabila sync failed",
        });
      }
    } catch (error) {
      console.error("Failed to sync Kabila launchpads:", error);
      setSyncResult({
        type: "kabila",
        message: "Failed to sync Kabila launchpads",
      });
    } finally {
      setSyncingKabila(false);
    }
  }

  async function handleSyncCollections() {
    setSyncingCollections(true);
    setSyncResult(null);
    try {
      // Use Kabila API for full collection sync
      const response = await fetch("/api/admin/sync/collections", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "collections",
          message: data.message || `Synced ${data.synced || 0} collections from Kabila`,
        });
      } else {
        setSyncResult({
          type: "collections",
          message: data.error || "Sync failed",
        });
      }
    } catch (error) {
      console.error("Failed to sync collections:", error);
      setSyncResult({
        type: "collections",
        message: "Failed to sync collections",
      });
    } finally {
      setSyncingCollections(false);
    }
  }

  async function handleAddCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newCollectionTokenId.trim()) return;

    setAddingCollection(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: newCollectionTokenId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "add-collection",
          message: data.message || `Added collection ${data.collection?.name}`,
        });
        setNewCollectionTokenId("");
      } else {
        setSyncResult({
          type: "add-collection",
          message: data.error || "Failed to add collection",
        });
      }
    } catch (error) {
      console.error("Failed to add collection:", error);
      setSyncResult({
        type: "add-collection",
        message: "Failed to add collection",
      });
    } finally {
      setAddingCollection(false);
    }
  }

  async function handleDeleteCollections() {
    if (!confirm("This will DELETE ALL collections and their votes. Are you sure?")) {
      return;
    }

    setDeletingCollections(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/collections", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "delete-collections",
          message: data.message || `Deleted ${data.deleted || 0} collections`,
        });
      } else {
        setSyncResult({
          type: "delete-collections",
          message: data.error || "Delete failed",
        });
      }
    } catch (error) {
      console.error("Failed to delete collections:", error);
      setSyncResult({
        type: "delete-collections",
        message: "Failed to delete collections",
      });
    } finally {
      setDeletingCollections(false);
    }
  }

  async function handleCleanup() {
    if (!confirm("This will DELETE all events except Forever Mints. Are you sure?")) {
      return;
    }

    setCleaningUp(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "cleanup",
          message: data.message || `Deleted ${data.deleted} events`,
        });
        // Refresh pending events
        fetchPendingEvents();
      } else {
        setSyncResult({
          type: "cleanup",
          message: data.error || "Cleanup failed",
        });
      }
    } catch (error) {
      console.error("Failed to cleanup:", error);
      setSyncResult({
        type: "cleanup",
        message: "Failed to cleanup events",
      });
    } finally {
      setCleaningUp(false);
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

      {/* Sync Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* SentX Launchpads */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Sync SentX</p>
                  <p className="text-xs text-text-secondary">Import from SentX</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleSyncLaunchpads}
                loading={syncingLaunchpads}
                className="gap-2"
              >
                <RefreshCw className={syncingLaunchpads ? "animate-spin" : ""} />
                Sync
              </Button>
            </div>
            {syncResult?.type === "launchpads" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Kabila Launchpads */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Sync Kabila</p>
                  <p className="text-xs text-text-secondary">Import from Kabila</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleSyncKabila}
                loading={syncingKabila}
                className="gap-2"
              >
                <RefreshCw className={syncingKabila ? "animate-spin" : ""} />
                Sync
              </Button>
            </div>
            {syncResult?.type === "kabila" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Collections Sync */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Layers className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Sync Collections</p>
                  <p className="text-xs text-text-secondary">Import ALL from Kabila</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleSyncCollections}
                loading={syncingCollections}
                className="gap-2"
              >
                <RefreshCw className={syncingCollections ? "animate-spin" : ""} />
                Sync
              </Button>
            </div>
            {syncResult?.type === "collections" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Add Collection Manually */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Plus className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="font-medium">Add Collection</p>
                <p className="text-xs text-text-secondary">Add by Token ID</p>
              </div>
            </div>
            <form onSubmit={handleAddCollection} className="flex gap-2">
              <Input
                placeholder="0.0.XXXXX"
                value={newCollectionTokenId}
                onChange={(e) => setNewCollectionTokenId(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" loading={addingCollection}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            {syncResult?.type === "add-collection" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Delete Collections */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Trash2 className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Delete Collections</p>
                  <p className="text-xs text-text-secondary">Remove all collections</p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteCollections}
                loading={deletingCollections}
                className="gap-2"
              >
                <Trash2 className={deletingCollections ? "animate-spin" : ""} />
                Delete
              </Button>
            </div>
            {syncResult?.type === "delete-collections" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Cleanup */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">Cleanup Events</p>
                  <p className="text-xs text-text-secondary">Delete all except Forever</p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleCleanup}
                loading={cleaningUp}
                className="gap-2"
              >
                <Trash2 className={cleaningUp ? "animate-spin" : ""} />
                Clean
              </Button>
            </div>
            {syncResult?.type === "cleanup" && (
              <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
            )}
          </CardContent>
        </Card>
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

          {/* Pending Collections */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Pending Collections ({pendingCollections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCollections ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-20 bg-bg-secondary animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : pendingCollections.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 mx-auto text-success mb-3" />
                  <p className="text-text-secondary text-sm">No pending collections to review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg"
                    >
                      {/* Image */}
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                        {collection.image ? (
                          <Image
                            src={collection.image}
                            alt={collection.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="h-5 w-5 text-text-secondary" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{collection.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="font-mono">{collection.tokenAddress}</span>
                          {collection.supply > 0 && (
                            <>
                              <span>•</span>
                              <span>{collection.supply.toLocaleString()} supply</span>
                            </>
                          )}
                        </div>
                        {collection.submittedBy && (
                          <p className="text-xs text-text-secondary mt-1">
                            By: {collection.submittedBy}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleCollectionAction(collection.id, "approve")}
                          loading={processingCollection === collection.id}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCollectionAction(collection.id, "reject")}
                          loading={processingCollection === collection.id}
                          className="gap-1"
                        >
                          <XCircle className="h-3 w-3" />
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
