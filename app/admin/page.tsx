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
  Megaphone,
  EyeOff,
  Eye,
  Coins,
  Mic2,
  Search,
  Globe,
  Pencil,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { CountrySelector } from "@/components/community/CountrySelector";

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  endDate: string | null;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  category: string;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  event_type: string | null;
  host: string | null;
  language: string | null;
  location: string | null;
  location_type: string | null;
  prizes: string | null;
  custom_links: any;
  isForeverMint: boolean;
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

type TabId = "events" | "collections" | "tokens" | "ecosystem" | "community" | "admins";

const ECOSYSTEM_CATEGORIES = [
  "DEFI", "TOOLS", "MARKETPLACE", "DATA", "COMMUNITY",
  "WALLET", "BRIDGE", "GAMING", "NFT", "EDUCATION",
  "INFRASTRUCTURE", "OTHER",
] as const;

export default function AdminPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<TabId>("events");

  // Existing states
  const [pendingEvents, setPendingEvents] = React.useState<PendingEvent[]>([]);
  const [pendingCollections, setPendingCollections] = React.useState<PendingCollection[]>([]);
  const [pendingHostRequests, setPendingHostRequests] = React.useState(0);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingAdmins, setLoadingAdmins] = React.useState(true);
  const [loadingCollections, setLoadingCollections] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [previewEventId, setPreviewEventId] = React.useState<string | null>(null);
  const [processingCollection, setProcessingCollection] = React.useState<string | null>(null);
  const [newAdminWallet, setNewAdminWallet] = React.useState("");
  const [addingAdmin, setAddingAdmin] = React.useState(false);
  const [removingAdmin, setRemovingAdmin] = React.useState<string | null>(null);
  const [syncingLaunchpads, setSyncingLaunchpads] = React.useState(false);
  const [syncingKabila, setSyncingKabila] = React.useState(false);
  const [syncingCollections, setSyncingCollections] = React.useState(false);
  const [addingCollection, setAddingCollection] = React.useState(false);
  const [newCollectionTokenId, setNewCollectionTokenId] = React.useState("");
  const [deleteCollectionId, setDeleteCollectionId] = React.useState("");
  const [deletingCollection, setDeletingCollection] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<{
    type: "launchpads" | "kabila" | "collections" | "delete-collection" | "add-collection" | "hide-collection" | "sync-tokens" | "hide-token" | "delete-token" | "add-token";
    message: string;
  } | null>(null);
  const [hideCollectionId, setHideCollectionId] = React.useState("");
  const [hidingCollection, setHidingCollection] = React.useState(false);
  const [hiddenCollections, setHiddenCollections] = React.useState<Array<{
    id: string;
    tokenAddress: string;
    name: string;
    image: string | null;
  }>>([]);
  const [loadingHidden, setLoadingHidden] = React.useState(true);
  const [togglingHidden, setTogglingHidden] = React.useState<string | null>(null);

  // Token states
  const [syncingTokens, setSyncingTokens] = React.useState(false);
  const [hideTokenId, setHideTokenId] = React.useState("");
  const [hidingToken, setHidingToken] = React.useState(false);
  const [deleteTokenId, setDeleteTokenId] = React.useState("");
  const [deletingToken, setDeletingToken] = React.useState(false);
  const [addTokenId, setAddTokenId] = React.useState("");
  const [addingToken, setAddingToken] = React.useState(false);
  const [hiddenTokens, setHiddenTokens] = React.useState<Array<{
    id: string;
    tokenAddress: string;
    symbol: string;
    icon: string | null;
  }>>([]);
  const [loadingHiddenTokens, setLoadingHiddenTokens] = React.useState(true);
  const [togglingHiddenToken, setTogglingHiddenToken] = React.useState<string | null>(null);

  // Ecosystem states (pending)
  const [ecosystemProjects, setEcosystemProjects] = React.useState<any[]>([]);
  const [loadingEcosystem, setLoadingEcosystem] = React.useState(true);
  const [processingEcosystem, setProcessingEcosystem] = React.useState<string | null>(null);

  // Ecosystem states (all projects)
  const [allEcosystemProjects, setAllEcosystemProjects] = React.useState<any[]>([]);
  const [loadingAllEcosystem, setLoadingAllEcosystem] = React.useState(true);
  const [editingEcosystemId, setEditingEcosystemId] = React.useState<string | null>(null);
  const [editEcosystemData, setEditEcosystemData] = React.useState<Record<string, any>>({});
  const [savingEcosystem, setSavingEcosystem] = React.useState(false);
  const [ecosystemSearch, setEcosystemSearch] = React.useState("");
  const [ecosystemCategoryFilter, setEcosystemCategoryFilter] = React.useState<string>("all");
  const [deletingEcosystemId, setDeletingEcosystemId] = React.useState<string | null>(null);

  // Community/HashWorld states
  const [pendingProfiles, setPendingProfiles] = React.useState<any[]>([]);
  const [approvedProfiles, setApprovedProfiles] = React.useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = React.useState(true);
  const [processingProfile, setProcessingProfile] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }

    fetchPendingEvents();
    fetchPendingCollections();
    fetchAdmins();
    fetchHiddenCollections();
    fetchHiddenTokens();
    fetchEcosystemProjects();
    fetchAllEcosystemProjects();
    fetchPendingHostRequests();
    fetchCommunityProfiles();
  }, [isConnected, user, router]);

  async function fetchPendingHostRequests() {
    try {
      const res = await fetch("/api/admin/host-requests?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setPendingHostRequests(data.requests?.length || 0);
      }
    } catch {}
  }

  // ========== COMMUNITY/HASHWORLD FUNCTIONS ==========

  async function fetchCommunityProfiles() {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch("/api/admin/community?status=pending"),
        fetch("/api/admin/community?status=approved"),
      ]);
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingProfiles(data.profiles || []);
      }
      if (approvedRes.ok) {
        const data = await approvedRes.json();
        setApprovedProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error("Failed to fetch community profiles:", error);
    } finally {
      setLoadingProfiles(false);
    }
  }

  async function handleProfileAction(id: string, action: "approve" | "delete") {
    setProcessingProfile(id);
    try {
      if (action === "approve") {
        await fetch(`/api/admin/community/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true }),
        });
      } else {
        await fetch(`/api/admin/community/${id}`, { method: "DELETE" });
      }
      fetchCommunityProfiles();
    } catch (error) {
      console.error(`Failed to ${action} profile:`, error);
    } finally {
      setProcessingProfile(null);
    }
  }

  // ========== ECOSYSTEM FUNCTIONS ==========

  async function fetchEcosystemProjects() {
    try {
      const res = await fetch("/api/admin/ecosystem?status=pending");
      if (res.ok) {
        const data = await res.json();
        setEcosystemProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch ecosystem projects:", error);
    } finally {
      setLoadingEcosystem(false);
    }
  }

  async function fetchAllEcosystemProjects() {
    try {
      const res = await fetch("/api/admin/ecosystem");
      if (res.ok) {
        const data = await res.json();
        setAllEcosystemProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch all ecosystem projects:", error);
    } finally {
      setLoadingAllEcosystem(false);
    }
  }

  async function handleEcosystemAction(id: string, action: "approve" | "delete") {
    setProcessingEcosystem(id);
    try {
      if (action === "approve") {
        await fetch(`/api/admin/ecosystem/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true }),
        });
      } else {
        await fetch(`/api/admin/ecosystem/${id}`, { method: "DELETE" });
      }
      setEcosystemProjects((prev) => prev.filter((p) => p.id !== id));
      fetchAllEcosystemProjects();
    } catch (error) {
      console.error(`Failed to ${action} ecosystem project:`, error);
    } finally {
      setProcessingEcosystem(null);
    }
  }

  async function handleEditEcosystem(id: string, data: Record<string, any>) {
    setSavingEcosystem(true);
    try {
      const res = await fetch(`/api/admin/ecosystem/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingEcosystemId(null);
        setEditEcosystemData({});
        fetchAllEcosystemProjects();
        fetchEcosystemProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update project");
      }
    } catch (error) {
      console.error("Failed to edit ecosystem project:", error);
      alert("Failed to update project");
    } finally {
      setSavingEcosystem(false);
    }
  }

  async function handleDeleteEcosystemProject(id: string) {
    if (!confirm("Are you sure you want to delete this ecosystem project? This cannot be undone.")) return;
    setDeletingEcosystemId(id);
    try {
      const res = await fetch(`/api/admin/ecosystem/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAllEcosystemProjects((prev) => prev.filter((p) => p.id !== id));
        setEcosystemProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete ecosystem project:", error);
    } finally {
      setDeletingEcosystemId(null);
    }
  }

  // ========== COLLECTION FUNCTIONS ==========

  async function fetchHiddenCollections() {
    try {
      const response = await fetch("/api/admin/collections?limit=100");
      if (response.ok) {
        const data = await response.json();
        const hidden = data.collections.filter((c: { isHidden: boolean }) => c.isHidden);
        setHiddenCollections(hidden);
      }
    } catch (error) {
      console.error("Failed to fetch hidden collections:", error);
    } finally {
      setLoadingHidden(false);
    }
  }

  async function handleHideCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!hideCollectionId.trim()) return;

    setHidingCollection(true);
    setSyncResult(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(hideCollectionId.trim())}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "hide-collection",
          message: data.message || `Collection hidden`,
        });
        setHideCollectionId("");
        fetchHiddenCollections();
      } else {
        setSyncResult({
          type: "hide-collection",
          message: data.error || "Failed to hide collection",
        });
      }
    } catch (error) {
      console.error("Failed to hide collection:", error);
      setSyncResult({
        type: "hide-collection",
        message: "Failed to hide collection",
      });
    } finally {
      setHidingCollection(false);
    }
  }

  async function handleToggleHidden(tokenAddress: string, currentlyHidden: boolean) {
    setTogglingHidden(tokenAddress);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(tokenAddress)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentlyHidden }),
      });

      if (response.ok) {
        fetchHiddenCollections();
      }
    } catch (error) {
      console.error("Failed to toggle collection visibility:", error);
    } finally {
      setTogglingHidden(null);
    }
  }

  // ========== TOKEN FUNCTIONS ==========

  async function fetchHiddenTokens() {
    try {
      const response = await fetch("/api/admin/tokens?limit=100");
      if (response.ok) {
        const data = await response.json();
        const hidden = data.tokens.filter((t: { isHidden: boolean }) => t.isHidden);
        setHiddenTokens(hidden);
      }
    } catch (error) {
      console.error("Failed to fetch hidden tokens:", error);
    } finally {
      setLoadingHiddenTokens(false);
    }
  }

  async function handleSyncTokens() {
    setSyncingTokens(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/tokens/sync", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        setSyncResult({
          type: "sync-tokens",
          message: data.message || `Synced ${data.stats?.created || 0} new tokens`,
        });
      } else {
        setSyncResult({
          type: "sync-tokens",
          message: data.error || "Failed to sync tokens",
        });
      }
    } catch (error) {
      console.error("Failed to sync tokens:", error);
      setSyncResult({
        type: "sync-tokens",
        message: "Failed to sync tokens",
      });
    } finally {
      setSyncingTokens(false);
    }
  }

  async function handleAddToken(e: React.FormEvent) {
    e.preventDefault();
    if (!addTokenId.trim()) return;

    setAddingToken(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: addTokenId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "add-token",
          message: data.message || `Token added`,
        });
        setAddTokenId("");
      } else {
        setSyncResult({
          type: "add-token",
          message: data.error || "Failed to add token",
        });
      }
    } catch (error) {
      console.error("Failed to add token:", error);
      setSyncResult({
        type: "add-token",
        message: "Failed to add token",
      });
    } finally {
      setAddingToken(false);
    }
  }

  async function handleHideToken(e: React.FormEvent) {
    e.preventDefault();
    if (!hideTokenId.trim()) return;

    setHidingToken(true);
    setSyncResult(null);
    try {
      const response = await fetch(`/api/admin/tokens/${encodeURIComponent(hideTokenId.trim())}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "hide-token",
          message: data.message || `Token hidden`,
        });
        setHideTokenId("");
        fetchHiddenTokens();
      } else {
        setSyncResult({
          type: "hide-token",
          message: data.error || "Failed to hide token",
        });
      }
    } catch (error) {
      console.error("Failed to hide token:", error);
      setSyncResult({
        type: "hide-token",
        message: "Failed to hide token",
      });
    } finally {
      setHidingToken(false);
    }
  }

  async function handleDeleteToken(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteTokenId.trim()) return;

    setDeletingToken(true);
    setSyncResult(null);
    try {
      const response = await fetch(`/api/admin/tokens/${encodeURIComponent(deleteTokenId.trim())}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "delete-token",
          message: data.message || `Token deleted`,
        });
        setDeleteTokenId("");
        fetchHiddenTokens();
      } else {
        setSyncResult({
          type: "delete-token",
          message: data.error || "Failed to delete token",
        });
      }
    } catch (error) {
      console.error("Failed to delete token:", error);
      setSyncResult({
        type: "delete-token",
        message: "Failed to delete token",
      });
    } finally {
      setDeletingToken(false);
    }
  }

  async function handleToggleHiddenToken(tokenAddress: string, currentlyHidden: boolean) {
    setTogglingHiddenToken(tokenAddress);
    try {
      const response = await fetch(`/api/admin/tokens/${encodeURIComponent(tokenAddress)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentlyHidden }),
      });

      if (response.ok) {
        fetchHiddenTokens();
      }
    } catch (error) {
      console.error("Failed to toggle token visibility:", error);
    } finally {
      setTogglingHiddenToken(null);
    }
  }

  // ========== EVENT FUNCTIONS ==========

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

  // ========== COLLECTION PENDING FUNCTIONS ==========

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

  // ========== ADMIN FUNCTIONS ==========

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

  // ========== SYNC FUNCTIONS ==========

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

  async function handleDeleteSpecificCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteCollectionId.trim()) return;

    if (!confirm(`Are you sure you want to delete collection ${deleteCollectionId}? This will also delete all its votes.`)) {
      return;
    }

    setDeletingCollection(true);
    setSyncResult(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(deleteCollectionId.trim())}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncResult({
          type: "delete-collection",
          message: data.message || `Deleted collection ${deleteCollectionId}`,
        });
        setDeleteCollectionId("");
      } else {
        setSyncResult({
          type: "delete-collection",
          message: data.error || "Delete failed",
        });
      }
    } catch (error) {
      console.error("Failed to delete collection:", error);
      setSyncResult({
        type: "delete-collection",
        message: "Failed to delete collection",
      });
    } finally {
      setDeletingCollection(false);
    }
  }

  // ========== ECOSYSTEM FILTERING ==========

  const filteredAllEcosystemProjects = React.useMemo(() => {
    let filtered = allEcosystemProjects;
    if (ecosystemSearch) {
      const q = ecosystemSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.websiteUrl?.toLowerCase().includes(q)
      );
    }
    if (ecosystemCategoryFilter !== "all") {
      filtered = filtered.filter((p) => (p.categories || []).includes(ecosystemCategoryFilter));
    }
    return filtered;
  }, [allEcosystemProjects, ecosystemSearch, ecosystemCategoryFilter]);

  // ========== GUARDS ==========

  if (!isConnected || !user?.isAdmin) {
    return null;
  }

  // ========== TAB DEFINITIONS ==========

  const tabs: { id: TabId; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: "events", label: "Events", count: pendingEvents.length, icon: <Calendar className="h-4 w-4" /> },
    { id: "collections", label: "Collections", count: pendingCollections.length, icon: <Layers className="h-4 w-4" /> },
    { id: "tokens", label: "Tokens", icon: <Coins className="h-4 w-4" /> },
    { id: "ecosystem", label: "Ecosystem", count: ecosystemProjects.length, icon: <Globe className="h-4 w-4" /> },
    { id: "community", label: "HashWorld", count: pendingProfiles.length, icon: <Globe className="h-4 w-4" /> },
    { id: "admins", label: "Admins", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-md bg-brand-subtle">
          <Shield className="h-8 w-8 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-text-secondary">Manage events and platform settings</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Link href="/admin/events">
          <Card hover>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-subtle">
                  <Calendar className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium">All Events</p>
                  <p className="text-xs text-text-secondary">Manage published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/events/new">
          <Card hover>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Create Event</p>
                  <p className="text-xs text-text-secondary">Add new event</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/ads">
          <Card hover>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Megaphone className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Home Ads</p>
                  <p className="text-xs text-text-secondary">Manage carousel</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/hosts">
          <Card hover>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Mic2 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    Host Requests
                    {pendingHostRequests > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-purple-500 text-white">
                        {pendingHostRequests}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">Approve hosts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Admin tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                    activeTab === tab.id
                      ? "bg-brand/10 text-brand"
                      : "bg-bg-secondary text-text-tertiary"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ============================== */}
      {/* EVENTS TAB                     */}
      {/* ============================== */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {/* Sync cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Pending Events */}
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
                      className="bg-bg-secondary rounded-lg overflow-hidden"
                    >
                      <div className="flex flex-col lg:flex-row gap-4 p-4">
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
                                {event.event_type && (
                                  <Badge variant="default" className="text-[10px]">
                                    {event.event_type.replace("_", " ")}
                                  </Badge>
                                )}
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
                                className="flex items-center gap-1 hover:text-brand"
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
                                className="flex items-center gap-1 hover:text-brand"
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
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewEventId(previewEventId === event.id ? null : event.id)}
                            className={cn("gap-1", previewEventId === event.id && "text-brand")}
                          >
                            {previewEventId === event.id ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            Preview
                          </Button>
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

                      {/* Expandable Preview Panel */}
                      {previewEventId === event.id && (
                        <div className="border-t border-border px-4 pb-4 pt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Full image + full description */}
                            <div>
                              {event.imageUrl && (
                                <div className="w-full h-52 relative rounded-lg overflow-hidden mb-3">
                                  <Image
                                    src={event.imageUrl}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <h4 className="text-xs font-bold text-text-tertiary uppercase mb-1">Full Description</h4>
                              <p className="text-sm text-text-secondary whitespace-pre-wrap">{event.description}</p>
                            </div>

                            {/* Right: All details */}
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-text-tertiary text-xs block">Start Date</span>
                                  <span className="text-text-primary font-medium">{formatDateTime(event.mintDate)}</span>
                                </div>
                                {event.endDate && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block">End Date</span>
                                    <span className="text-text-primary font-medium">{formatDateTime(event.endDate)}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-text-tertiary text-xs block">Price</span>
                                  <span className="text-text-primary font-medium">{event.mintPrice || "—"}</span>
                                </div>
                                {event.supply && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block">Supply</span>
                                    <span className="text-text-primary font-medium">{event.supply.toLocaleString()}</span>
                                  </div>
                                )}
                                {event.category && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block">Category</span>
                                    <span className="text-text-primary font-medium">{event.category}</span>
                                  </div>
                                )}
                                {event.host && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block">Host</span>
                                    <span className="text-text-primary font-medium">{event.host}</span>
                                  </div>
                                )}
                                {event.language && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block">Language</span>
                                    <span className="text-text-primary font-medium">{event.language}</span>
                                  </div>
                                )}
                                {event.location && (
                                  <div>
                                    <span className="text-text-tertiary text-xs block flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> Location
                                    </span>
                                    <span className="text-text-primary font-medium">
                                      {event.location}
                                      {event.location_type && (
                                        <span className="text-text-tertiary text-xs ml-1">({event.location_type.replace("_", " ")})</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {event.prizes && (
                                  <div className="col-span-2">
                                    <span className="text-text-tertiary text-xs block">Prizes</span>
                                    <span className="text-text-primary font-medium">{event.prizes}</span>
                                  </div>
                                )}
                                {event.isForeverMint && (
                                  <div>
                                    <Badge variant="default">Forever Mint</Badge>
                                  </div>
                                )}
                              </div>

                              {/* Links */}
                              <div>
                                <h4 className="text-xs font-bold text-text-tertiary uppercase mb-2">Links</h4>
                                <div className="flex flex-wrap gap-2">
                                  {event.websiteUrl && (
                                    <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-card border border-border text-xs text-text-secondary hover:text-text-primary transition-colors">
                                      <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                  {event.twitterUrl && (
                                    <a href={event.twitterUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-card border border-border text-xs text-text-secondary hover:text-text-primary transition-colors">
                                      𝕏 Twitter <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                  {event.discordUrl && (
                                    <a href={event.discordUrl} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-card border border-border text-xs text-text-secondary hover:text-text-primary transition-colors">
                                      Discord <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                  {event.custom_links && Array.isArray(event.custom_links) && event.custom_links.map((link: any, i: number) => (
                                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-card border border-border text-xs text-text-secondary hover:text-text-primary transition-colors">
                                      {link.label || "Link"} <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  ))}
                                  {!event.websiteUrl && !event.twitterUrl && !event.discordUrl && (
                                    <span className="text-xs text-text-tertiary">No links provided</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-xs text-text-tertiary pt-1 border-t border-border">
                                Submitted on {formatDate(event.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* COLLECTIONS TAB                */}
      {/* ============================== */}
      {activeTab === "collections" && (
        <div className="space-y-6">
          {/* Collection management cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Delete Specific Collection */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Trash2 className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Delete Collection</p>
                    <p className="text-xs text-text-secondary">Remove by Token ID</p>
                  </div>
                </div>
                <form
                  onSubmit={handleDeleteSpecificCollection}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Token ID (0.0.XXXXX)"
                    value={deleteCollectionId}
                    onChange={(e) => setDeleteCollectionId(e.target.value)}
                    disabled={deletingCollection}
                  />
                  <Button type="submit" variant="destructive" size="sm" loading={deletingCollection}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
                {syncResult?.type === "delete-collection" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Hide Collection */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-lg bg-gray-500/10">
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">Hide Collection</p>
                    <p className="text-xs text-text-secondary">Exclude from ranking</p>
                  </div>
                </div>
                <form onSubmit={handleHideCollection} className="flex gap-2">
                  <Input
                    placeholder="Token ID (0.0.XXXXX)"
                    value={hideCollectionId}
                    onChange={(e) => setHideCollectionId(e.target.value)}
                    disabled={hidingCollection}
                  />
                  <Button type="submit" variant="secondary" size="sm" loading={hidingCollection}>
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </form>
                {syncResult?.type === "hide-collection" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden Collections List */}
          {hiddenCollections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeOff className="h-5 w-5" />
                  Hidden Collections ({hiddenCollections.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {hiddenCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                        {collection.image ? (
                          <Image
                            src={collection.image}
                            alt={collection.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="h-4 w-4 text-text-secondary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{collection.name}</p>
                        <p className="text-xs text-text-secondary truncate">{collection.tokenAddress}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleHidden(collection.tokenAddress, true)}
                        disabled={togglingHidden === collection.tokenAddress}
                        className="flex-shrink-0"
                        title="Show collection"
                      >
                        {togglingHidden === collection.tokenAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 text-success" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Collections */}
          <Card>
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
                          <span className="">{collection.tokenAddress}</span>
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
      )}

      {/* ============================== */}
      {/* TOKENS TAB                     */}
      {/* ============================== */}
      {activeTab === "tokens" && (
        <div className="space-y-6">
          {/* Token management cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sync Tokens */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">Sync Tokens</p>
                      <p className="text-xs text-text-secondary">Import from Eta Finance</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSyncTokens}
                    loading={syncingTokens}
                    className="gap-2"
                  >
                    <RefreshCw className={syncingTokens ? "animate-spin" : ""} />
                    Sync
                  </Button>
                </div>
                {syncResult?.type === "sync-tokens" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Add Token Manually */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-lg bg-teal-500/10">
                    <Plus className="h-6 w-6 text-teal-500" />
                  </div>
                  <div>
                    <p className="font-medium">Add Token</p>
                    <p className="text-xs text-text-secondary">Add by Token ID</p>
                  </div>
                </div>
                <form onSubmit={handleAddToken} className="flex gap-2">
                  <Input
                    placeholder="0.0.XXXXX"
                    value={addTokenId}
                    onChange={(e) => setAddTokenId(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" loading={addingToken}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
                {syncResult?.type === "add-token" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Hide Token */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-lg bg-gray-500/10">
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">Hide Token</p>
                    <p className="text-xs text-text-secondary">Exclude from ranking</p>
                  </div>
                </div>
                <form onSubmit={handleHideToken} className="flex gap-2">
                  <Input
                    placeholder="0.0.XXXXX"
                    value={hideTokenId}
                    onChange={(e) => setHideTokenId(e.target.value)}
                    disabled={hidingToken}
                  />
                  <Button type="submit" variant="secondary" size="sm" loading={hidingToken}>
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </form>
                {syncResult?.type === "hide-token" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Delete Token */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <Trash2 className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">Delete Token</p>
                    <p className="text-xs text-text-secondary">Remove by Token ID</p>
                  </div>
                </div>
                <form onSubmit={handleDeleteToken} className="flex gap-2">
                  <Input
                    placeholder="0.0.XXXXX"
                    value={deleteTokenId}
                    onChange={(e) => setDeleteTokenId(e.target.value)}
                    disabled={deletingToken}
                  />
                  <Button type="submit" variant="destructive" size="sm" loading={deletingToken}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
                {syncResult?.type === "delete-token" && (
                  <p className="mt-3 text-sm text-text-secondary">{syncResult.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden Tokens List */}
          {hiddenTokens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Hidden Tokens ({hiddenTokens.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {hiddenTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                        {token.icon ? (
                          <Image
                            src={token.icon}
                            alt={token.symbol}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Coins className="h-4 w-4 text-text-secondary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{token.symbol}</p>
                        <p className="text-xs text-text-secondary truncate">{token.tokenAddress}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleHiddenToken(token.tokenAddress, true)}
                        disabled={togglingHiddenToken === token.tokenAddress}
                        className="flex-shrink-0"
                        title="Show token"
                      >
                        {togglingHiddenToken === token.tokenAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 text-success" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================== */}
      {/* ECOSYSTEM TAB                  */}
      {/* ============================== */}
      {activeTab === "ecosystem" && (
        <div className="space-y-6">
          {/* Section 1: Pending Applications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Applications ({ecosystemProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEcosystem ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                </div>
              ) : ecosystemProjects.length === 0 ? (
                <p className="text-text-secondary text-sm py-4 text-center">No pending projects</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ecosystemProjects.map((project: any) => (
                    <div key={project.id} className="p-4 rounded-lg border border-border bg-bg-secondary/30">
                      <div className="flex items-start gap-3">
                        {project.logoUrl ? (
                          <img src={project.logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-bg-card flex items-center justify-center flex-shrink-0">
                            <Globe className="h-5 w-5 text-text-tertiary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-text-primary truncate">{project.name}</span>
                            {(project.categories || []).map((c: string) => <Badge key={c} variant="outline" className="text-[10px] flex-shrink-0">{c}</Badge>)}
                          </div>
                          <p className="text-xs text-text-secondary line-clamp-2 mb-2">{project.description}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-tertiary">
                            <span>by {project.submittedBy?.alias || project.submittedBy?.walletAddress}</span>
                            {project.websiteUrl && (
                              <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-brand">
                                <ExternalLink className="h-2.5 w-2.5" />
                                {project.websiteUrl.replace(/https?:\/\//, "").replace(/\/$/, "")}
                              </a>
                            )}
                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleEcosystemAction(project.id, "approve")}
                          loading={processingEcosystem === project.id}
                          className="gap-1 text-xs flex-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEcosystemAction(project.id, "delete")}
                          loading={processingEcosystem === project.id}
                          className="gap-1 text-xs flex-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: All Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                All Projects ({allEcosystemProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and filter bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search projects..."
                    value={ecosystemSearch}
                    onChange={(e) => setEcosystemSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={ecosystemCategoryFilter}
                  onChange={(e) => setEcosystemCategoryFilter(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-bg-card text-text-primary px-3 text-sm"
                >
                  <option value="all">All Categories</option>
                  {ECOSYSTEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {loadingAllEcosystem ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                </div>
              ) : filteredAllEcosystemProjects.length === 0 ? (
                <p className="text-text-secondary text-sm py-4 text-center">No projects found</p>
              ) : (
                <div className="space-y-2">
                  {filteredAllEcosystemProjects.map((project: any) => {
                    const isEditing = editingEcosystemId === project.id;
                    return (
                      <div key={project.id} className="rounded-lg border border-border overflow-hidden">
                        {/* Row */}
                        <div className="flex items-center gap-3 p-3 bg-bg-secondary/30">
                          {project.logoUrl ? (
                            <img src={project.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-bg-card flex items-center justify-center flex-shrink-0">
                              <Globe className="h-4 w-4 text-text-tertiary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-text-primary truncate">{project.name}</span>
                              {(project.categories || []).map((c: string) => <Badge key={c} variant="outline" className="text-[10px] flex-shrink-0">{c}</Badge>)}
                              {project.isApproved ? (
                                <Badge variant="default" className="text-[10px] flex-shrink-0 bg-green-600">Approved</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] flex-shrink-0 bg-yellow-500/20 text-yellow-500">Pending</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-tertiary mt-0.5">
                              {project.countryCode && <span>{project.countryCode}</span>}
                              {project.websiteUrl && (
                                <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand truncate max-w-[200px]">
                                  {project.websiteUrl.replace(/https?:\/\//, "").replace(/\/$/, "")}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingEcosystemId(null);
                                  setEditEcosystemData({});
                                } else {
                                  setEditingEcosystemId(project.id);
                                  setEditEcosystemData({
                                    name: project.name || "",
                                    categories: project.categories || ["OTHER"],
                                    countryCode: project.countryCode || "",
                                    description: project.description || "",
                                    websiteUrl: project.websiteUrl || "",
                                    logoUrl: project.logoUrl || "",
                                    twitterUrl: project.twitterUrl || "",
                                    discordUrl: project.discordUrl || "",
                                    telegramUrl: project.telegramUrl || "",
                                    linkedinUrl: project.linkedinUrl || "",
                                    contactEmail: project.contactEmail || "",
                                    isApproved: project.isApproved ?? false,
                                    isVisible: project.isVisible ?? true,
                                  });
                                }
                              }}
                              className="gap-1 text-xs"
                            >
                              {isEditing ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEcosystemProject(project.id)}
                              disabled={deletingEcosystemId === project.id}
                              className="text-error hover:text-error"
                            >
                              {deletingEcosystemId === project.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Edit Form */}
                        {isEditing && (
                          <div className="p-4 border-t border-border bg-bg-card">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left column */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Name</label>
                                  <Input
                                    value={editEcosystemData.name || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, name: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Categories</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ECOSYSTEM_CATEGORIES.map((cat) => {
                                      const sel = (editEcosystemData.categories || []).includes(cat);
                                      return (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => setEditEcosystemData((prev) => ({
                                            ...prev,
                                            categories: sel
                                              ? (prev.categories || []).filter((c: string) => c !== cat)
                                              : [...(prev.categories || []), cat],
                                          }))}
                                          className={cn(
                                            "px-2 py-1 rounded text-[10px] font-medium border transition-all",
                                            sel ? "bg-brand/10 text-brand border-brand/30" : "bg-bg-secondary text-text-tertiary border-border"
                                          )}
                                        >
                                          {cat}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Country</label>
                                  <CountrySelector
                                    value={editEcosystemData.countryCode || ""}
                                    onChange={(code) => setEditEcosystemData((prev) => ({ ...prev, countryCode: code }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Description</label>
                                  <textarea
                                    value={editEcosystemData.description || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full rounded-lg border border-border bg-bg-secondary text-text-primary px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Logo</label>
                                  <ImageUpload
                                    value={editEcosystemData.logoUrl || ""}
                                    onChange={(url) => setEditEcosystemData((prev) => ({ ...prev, logoUrl: url }))}
                                    recommendedSize="200x200"
                                  />
                                </div>
                              </div>
                              {/* Right column */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Website URL</label>
                                  <Input
                                    value={editEcosystemData.websiteUrl || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                                    placeholder="https://..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Twitter URL</label>
                                  <Input
                                    value={editEcosystemData.twitterUrl || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, twitterUrl: e.target.value }))}
                                    placeholder="https://x.com/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Discord URL</label>
                                  <Input
                                    value={editEcosystemData.discordUrl || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, discordUrl: e.target.value }))}
                                    placeholder="https://discord.gg/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Telegram URL</label>
                                  <Input
                                    value={editEcosystemData.telegramUrl || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, telegramUrl: e.target.value }))}
                                    placeholder="https://t.me/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">LinkedIn URL</label>
                                  <Input
                                    value={editEcosystemData.linkedinUrl || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                                    placeholder="https://linkedin.com/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-text-secondary mb-1 block">Contact Email</label>
                                  <Input
                                    value={editEcosystemData.contactEmail || ""}
                                    onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                                    placeholder="email@example.com"
                                  />
                                </div>

                                {/* Toggles */}
                                <div className="flex items-center gap-6 pt-2">
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={editEcosystemData.isApproved ?? false}
                                      onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, isApproved: e.target.checked }))}
                                      className="rounded border-border"
                                    />
                                    <span className="text-text-secondary">Approved</span>
                                  </label>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={editEcosystemData.isVisible ?? true}
                                      onChange={(e) => setEditEcosystemData((prev) => ({ ...prev, isVisible: e.target.checked }))}
                                      className="rounded border-border"
                                    />
                                    <span className="text-text-secondary">Visible</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Save / Cancel */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                              <Button
                                size="sm"
                                onClick={() => handleEditEcosystem(project.id, editEcosystemData)}
                                loading={savingEcosystem}
                                className="gap-1"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEcosystemId(null);
                                  setEditEcosystemData({});
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* HASHWORLD / COMMUNITY TAB      */}
      {/* ============================== */}
      {activeTab === "community" && (
        <div className="space-y-6">
          {/* Pending Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Profiles ({pendingProfiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                </div>
              ) : pendingProfiles.length === 0 ? (
                <p className="text-text-secondary text-sm py-4 text-center">No pending profiles</p>
              ) : (
                <div className="space-y-3">
                  {pendingProfiles.map((profile: any) => (
                    <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary/30">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-text-tertiary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-text-primary">{profile.displayName}</span>
                          <Badge variant="outline" className="text-[10px]">{profile.type}</Badge>
                          {profile.countryCode && (
                            <img
                              src={`https://flagcdn.com/w20/${profile.countryCode.toLowerCase()}.png`}
                              alt={profile.countryCode}
                              className="h-3"
                            />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary truncate">{profile.bio || "No bio"}</p>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          {profile.user?.walletAddress} · {profile.twitterHandle ? `@${profile.twitterHandle}` : "No X"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleProfileAction(profile.id, "approve")}
                          loading={processingProfile === profile.id}
                          className="gap-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleProfileAction(profile.id, "delete")}
                          loading={processingProfile === profile.id}
                          className="gap-1 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approved Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Approved Profiles ({approvedProfiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                </div>
              ) : approvedProfiles.length === 0 ? (
                <p className="text-text-secondary text-sm py-4 text-center">No approved profiles yet</p>
              ) : (
                <div className="space-y-2">
                  {approvedProfiles.map((profile: any) => (
                    <div key={profile.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                          <Users className="h-3.5 w-3.5 text-text-tertiary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-text-primary">{profile.displayName}</span>
                          <Badge variant="outline" className="text-[10px]">{profile.type}</Badge>
                          {profile.countryCode && (
                            <img
                              src={`https://flagcdn.com/w20/${profile.countryCode.toLowerCase()}.png`}
                              alt={profile.countryCode}
                              className="h-3"
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-text-tertiary">{profile.user?.walletAddress}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleProfileAction(profile.id, "delete")}
                        loading={processingProfile === profile.id}
                        className="text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* ADMINS TAB                     */}
      {/* ============================== */}
      {activeTab === "admins" && (
        <div className="max-w-xl">
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
                        <p className="text-sm truncate">{admin.walletAddress}</p>
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
      )}
    </div>
  );
}
