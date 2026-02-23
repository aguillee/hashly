"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  EyeOff,
  MousePointerClick,
  BarChart3,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useWalletStore } from "@/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HomeAd {
  id: string;
  type: "EVENT" | "CUSTOM";
  eventId: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  title: string | null;
  duration: number;
  order: number;
  isActive: boolean;
  views: number;
  clicks: number;
  event: {
    id: string;
    title: string;
    imageUrl: string | null;
    mintDate: string | null;
    status: string;
    votesUp: number;
  } | null;
}

interface EventOption {
  id: string;
  title: string;
  imageUrl: string | null;
  status: string;
}

export default function AdminAdsPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const [ads, setAds] = React.useState<HomeAd[]>([]);
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editSaving, setEditSaving] = React.useState(false);

  // Edit form state
  const [editType, setEditType] = React.useState<"EVENT" | "CUSTOM">("EVENT");
  const [editEventId, setEditEventId] = React.useState("");
  const [editImageUrl, setEditImageUrl] = React.useState("");
  const [editLinkUrl, setEditLinkUrl] = React.useState("");
  const [editTitle, setEditTitle] = React.useState("");
  const [editDuration, setEditDuration] = React.useState("5");

  // Create form state
  const [showForm, setShowForm] = React.useState(false);
  const [formType, setFormType] = React.useState<"EVENT" | "CUSTOM">("EVENT");
  const [formEventId, setFormEventId] = React.useState("");
  const [formImageUrl, setFormImageUrl] = React.useState("");
  const [formLinkUrl, setFormLinkUrl] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDuration, setFormDuration] = React.useState("5");

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }
    fetchAds();
    fetchEvents();
  }, [isConnected, user, router]);

  async function fetchAds() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/home-ads");
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads);
      }
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const response = await fetch("/api/admin/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(
          data.events.map((e: any) => ({
            id: e.id,
            title: e.title,
            imageUrl: e.imageUrl,
            status: e.status,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = {
        type: formType,
        duration: parseInt(formDuration) || 5,
        isActive: true,
      };

      if (formType === "EVENT") {
        body.eventId = formEventId;
      } else {
        body.imageUrl = formImageUrl || null;
        body.linkUrl = formLinkUrl || null;
        body.title = formTitle || null;
      }

      const response = await fetch("/api/admin/home-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setAds((prev) => [...prev, data.ad]);
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create ad");
      }
    } catch (error) {
      console.error("Failed to create ad:", error);
      alert("Failed to create ad");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setFormType("EVENT");
    setFormEventId("");
    setFormImageUrl("");
    setFormLinkUrl("");
    setFormTitle("");
    setFormDuration("5");
  }

  async function handleDelete(adId: string) {
    if (!confirm("Delete this ad?")) return;
    setDeleting(adId);
    try {
      const response = await fetch(`/api/admin/home-ads/${adId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setAds((prev) => prev.filter((a) => a.id !== adId));
      }
    } catch (error) {
      console.error("Failed to delete ad:", error);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(ad: HomeAd) {
    try {
      const response = await fetch(`/api/admin/home-ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      if (response.ok) {
        setAds((prev) =>
          prev.map((a) =>
            a.id === ad.id ? { ...a, isActive: !a.isActive } : a
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle ad:", error);
    }
  }

  async function handleMove(adId: string, direction: "up" | "down") {
    const index = ads.findIndex((a) => a.id === adId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === ads.length - 1) return;

    const newAds = [...ads];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newAds[index], newAds[swapIndex]] = [newAds[swapIndex], newAds[index]];

    setAds(newAds);

    try {
      await fetch("/api/admin/home-ads/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: newAds.map((a, i) => ({ id: a.id, order: i })),
        }),
      });
    } catch (error) {
      console.error("Failed to reorder:", error);
      fetchAds();
    }
  }

  async function handleDurationChange(adId: string, newDuration: number) {
    if (newDuration < 1 || newDuration > 60) return;
    try {
      const response = await fetch(`/api/admin/home-ads/${adId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: newDuration }),
      });
      if (response.ok) {
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId ? { ...a, duration: newDuration } : a
          )
        );
      }
    } catch (error) {
      console.error("Failed to update duration:", error);
    }
  }

  function startEdit(ad: HomeAd) {
    setEditingId(ad.id);
    setEditType(ad.type);
    setEditEventId(ad.eventId || "");
    setEditImageUrl(ad.imageUrl || "");
    setEditLinkUrl(ad.linkUrl || "");
    setEditTitle(ad.title || "");
    setEditDuration(String(ad.duration));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    try {
      const body: Record<string, any> = {
        type: editType,
        duration: parseInt(editDuration) || 5,
      };

      if (editType === "EVENT") {
        body.eventId = editEventId || null;
        body.imageUrl = null;
        body.linkUrl = null;
        body.title = null;
      } else {
        body.eventId = null;
        body.imageUrl = editImageUrl || null;
        body.linkUrl = editLinkUrl || null;
        body.title = editTitle || null;
      }

      const response = await fetch(`/api/admin/home-ads/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setAds((prev) =>
          prev.map((a) => (a.id === editingId ? { ...a, ...data.ad } : a))
        );
        setEditingId(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update ad");
      }
    } catch (error) {
      console.error("Failed to update ad:", error);
      alert("Failed to update ad");
    } finally {
      setEditSaving(false);
    }
  }

  // Computed stats
  const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  if (!isConnected || !user?.isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
        <Link
          href="/admin"
          className="p-1.5 sm:p-2 rounded-lg hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Home Ads</h1>
          <p className="text-xs sm:text-sm text-text-secondary truncate">
            Manage the homepage ad carousel
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-4">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">New Ad</span>
          <span className="xs:hidden">Add</span>
        </Button>
      </div>

      {/* Stats Panel */}
      {!loading && ads.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalViews.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-text-secondary">Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10">
                  <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-text-secondary">Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{avgCTR}%</p>
                  <p className="text-[10px] sm:text-xs text-text-secondary">CTR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Create Ad</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <form onSubmit={handleCreate} className="space-y-3 sm:space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ad Type
                </label>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormType("EVENT")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      formType === "EVENT"
                        ? "bg-accent-primary text-white"
                        : "bg-bg-card text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("CUSTOM")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      formType === "CUSTOM"
                        ? "bg-accent-primary text-white"
                        : "bg-bg-card text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Custom
                  </button>
                </div>
              </div>

              {formType === "EVENT" ? (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Event
                  </label>
                  <select
                    value={formEventId}
                    onChange={(e) => setFormEventId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="">Choose an event...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} ({event.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Title (for identification)
                    </label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g., Partner promo, Special offer..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Image
                    </label>
                    <ImageUpload
                      value={formImageUrl}
                      onChange={(url) => setFormImageUrl(url)}
                      recommendedSize="800×400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Link URL
                    </label>
                    <Input
                      value={formLinkUrl}
                      onChange={(e) => setFormLinkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (seconds in carousel)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                />
                <p className="text-xs text-text-secondary mt-1">
                  How many seconds this ad stays visible before rotating to the
                  next one.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={saving} className="flex-1">
                  Create Ad
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ads List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Active Carousel</span>
            <span className="sm:hidden">Carousel</span>
            <span className="text-text-secondary font-normal text-xs sm:text-sm">
              ({ads.filter((a) => a.isActive).length}/{ads.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-accent-primary" />
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Megaphone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-text-secondary mb-3 sm:mb-4" />
              <p className="text-sm text-text-secondary">
                No ads yet. Create your first ad.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ads.map((ad, index) => {
                const displayTitle =
                  ad.type === "EVENT" && ad.event
                    ? ad.event.title
                    : ad.title || "Untitled";
                const displayImage =
                  ad.type === "EVENT" && ad.event
                    ? ad.event.imageUrl
                    : ad.imageUrl;
                const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(1) : "0.0";

                return (
                  <React.Fragment key={ad.id}>
                  <div
                    className={cn(
                      "p-2.5 sm:p-3 rounded-lg border transition-colors",
                      ad.isActive
                        ? "bg-bg-secondary border-border"
                        : "bg-bg-secondary/50 border-border opacity-60"
                    )}
                  >
                    {/* Mobile Layout - Stacked */}
                    <div className="flex items-start gap-2 sm:hidden">
                      {/* Order + Thumbnail */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-text-secondary">
                          #{index + 1}
                        </span>
                        <div className="w-12 h-9 rounded overflow-hidden bg-bg-card flex-shrink-0">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={displayTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-3 w-3 text-text-secondary" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium truncate">
                            {displayTitle}
                          </span>
                          <Badge
                            variant={ad.type === "EVENT" ? "default" : "secondary"}
                            className="text-[8px] px-1.5 py-0 flex-shrink-0"
                          >
                            {ad.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-secondary flex-wrap">
                          <span>{ad.duration}s</span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-2.5 w-2.5" />
                            {(ad.views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MousePointerClick className="h-2.5 w-2.5" />
                            {(ad.clicks || 0).toLocaleString()}
                          </span>
                          <span className="text-accent-primary font-medium">{ctr}%</span>
                        </div>
                      </div>

                      {/* Actions - Compact for mobile */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => editingId === ad.id ? cancelEdit() : startEdit(ad)}
                          className="p-1.5 rounded hover:bg-bg-card transition-colors"
                        >
                          {editingId === ad.id ? (
                            <X className="h-3.5 w-3.5" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleActive(ad)}
                          className="p-1.5 rounded hover:bg-bg-card transition-colors"
                        >
                          {ad.isActive ? (
                            <Eye className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-text-secondary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          disabled={deleting === ad.id}
                          className="p-1.5 rounded hover:bg-bg-card transition-colors text-error"
                        >
                          {deleting === ad.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout - Horizontal */}
                    <div className="hidden sm:flex items-center gap-3">
                      {/* Order number */}
                      <span className="text-xs text-text-secondary w-5 text-center flex-shrink-0">
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-14 h-10 relative rounded-md overflow-hidden bg-bg-card flex-shrink-0">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={displayTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-text-secondary" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {displayTitle}
                          </span>
                          <Badge
                            variant={
                              ad.type === "EVENT" ? "default" : "secondary"
                            }
                            className="text-[10px] flex-shrink-0"
                          >
                            {ad.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                          <span>{ad.duration}s</span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {(ad.views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MousePointerClick className="h-3 w-3" />
                            {(ad.clicks || 0).toLocaleString()}
                          </span>
                          <span className="text-accent-primary font-medium">{ctr}% CTR</span>
                          {ad.type === "CUSTOM" && ad.linkUrl && (
                            <a
                              href={ad.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 hover:text-accent-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Link
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Duration edit */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={ad.duration}
                          onChange={(e) =>
                            handleDurationChange(ad.id, parseInt(e.target.value) || 5)
                          }
                          className="w-12 text-center rounded border border-border bg-bg-card px-1 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        />
                        <span className="text-xs text-text-secondary">s</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editingId === ad.id ? cancelEdit() : startEdit(ad)}
                          title="Edit"
                        >
                          {editingId === ad.id ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMove(ad.id, "up")}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMove(ad.id, "down")}
                          disabled={index === ads.length - 1}
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(ad)}
                          title={ad.isActive ? "Deactivate" : "Activate"}
                        >
                          {ad.isActive ? (
                            <Eye className="h-4 w-4 text-success" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-text-secondary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ad.id)}
                          disabled={deleting === ad.id}
                          title="Delete"
                          className="text-error hover:text-error"
                        >
                          {deleting === ad.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {editingId === ad.id && (
                    <form
                      onSubmit={handleSaveEdit}
                      className="mt-2 sm:ml-8 p-3 sm:p-4 rounded-lg border border-accent-primary/30 bg-bg-card space-y-3"
                    >
                      {/* Type selector */}
                      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                        <button
                          type="button"
                          onClick={() => setEditType("EVENT")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                            editType === "EVENT"
                              ? "bg-accent-primary text-white"
                              : "bg-bg-card text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          Event
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditType("CUSTOM")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                            editType === "CUSTOM"
                              ? "bg-accent-primary text-white"
                              : "bg-bg-card text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <ImageIcon className="h-3 w-3" />
                          Custom
                        </button>
                      </div>

                      {editType === "EVENT" ? (
                        <div>
                          <label className="block text-xs font-medium mb-1">Event</label>
                          <select
                            value={editEventId}
                            onChange={(e) => setEditEventId(e.target.value)}
                            required
                            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          >
                            <option value="">Choose an event...</option>
                            {events.map((event) => (
                              <option key={event.id} value={event.id}>
                                {event.title} ({event.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-medium mb-1">Title</label>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Ad title..."
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Image</label>
                            <ImageUpload
                              value={editImageUrl}
                              onChange={(url) => setEditImageUrl(url)}
                              recommendedSize="800×400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Link URL</label>
                            <Input
                              value={editLinkUrl}
                              onChange={(e) => setEditLinkUrl(e.target.value)}
                              placeholder="https://..."
                              className="text-sm"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-medium mb-1">Duration (seconds)</label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          className="w-24 text-sm"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button type="submit" size="sm" loading={editSaving}>
                          Save
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
