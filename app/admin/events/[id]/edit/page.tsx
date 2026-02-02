"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Calendar,
  ArrowLeft,
  Link as LinkIcon,
  Save,
  Loader2,
  Users,
  Code2,
  Trophy,
  MapPin,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Badge } from "@/components/ui/Badge";
import { useWalletStore } from "@/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EventType = "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "other", label: "Other" },
];

export default function AdminEditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, isConnected } = useWalletStore();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    mintDate: "",
    mintTime: "",
    mintPrice: "",
    supply: "",
    imageUrl: "",
    websiteUrl: "",
    twitterUrl: "",
    discordUrl: "",
    category: "",
    status: "UPCOMING" as "UPCOMING" | "LIVE",
    isApproved: false,
    isForeverMint: false,
    event_type: "MINT_EVENT" as EventType,
    host: "",
    language: "en",
    location: "",
    location_type: "ONLINE" as "ONLINE" | "IN_PERSON",
    prizes: "",
  });

  React.useEffect(() => {
    if (!isConnected || !user?.isAdmin) {
      router.push("/");
      return;
    }
    fetchEvent();
  }, [isConnected, user, router, eventId]);

  async function fetchEvent() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}`);
      if (!response.ok) {
        setError("Failed to load event");
        return;
      }
      const data = await response.json();
      const e = data.event;

      // Parse date/time from mintDate
      let mintDate = "";
      let mintTime = "";
      if (e.mintDate) {
        const d = new Date(e.mintDate);
        mintDate = d.toISOString().split("T")[0];
        mintTime = d.toISOString().split("T")[1]?.substring(0, 5) || "";
      }

      setFormData({
        title: e.title || "",
        description: e.description || "",
        mintDate,
        mintTime,
        mintPrice: e.mintPrice || "",
        supply: e.supply?.toString() || "",
        imageUrl: e.imageUrl || "",
        websiteUrl: e.websiteUrl || "",
        twitterUrl: e.twitterUrl || "",
        discordUrl: e.discordUrl || "",
        category: e.category || "",
        status: e.status || "UPCOMING",
        isApproved: e.isApproved || false,
        isForeverMint: e.isForeverMint || false,
        event_type: e.event_type || "MINT_EVENT",
        host: e.host || "",
        language: e.language || "en",
        location: e.location || "",
        location_type: e.location_type || "ONLINE",
        prizes: e.prizes || "",
      });
    } catch (err) {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const mintDateTime = formData.mintDate
        ? new Date(`${formData.mintDate}T${formData.mintTime || "00:00"}Z`).toISOString()
        : null;

      const body: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        mintDate: mintDateTime,
        mintPrice: formData.mintPrice,
        supply: formData.supply ? parseInt(formData.supply) : null,
        imageUrl: formData.imageUrl || null,
        websiteUrl: formData.websiteUrl || null,
        twitterUrl: formData.twitterUrl || null,
        discordUrl: formData.discordUrl || null,
        category: formData.category || null,
        status: formData.status,
        isApproved: formData.isApproved,
        isForeverMint: formData.isForeverMint,
        event_type: formData.event_type,
        host: formData.host || null,
        language: formData.language || null,
        location: formData.location || null,
        location_type: formData.location_type,
        prizes: formData.prizes || null,
      };

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update event");

      setSuccess("Event updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected || !user?.isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  const isMeetupOrHackathon = formData.event_type === "ECOSYSTEM_MEETUP" || formData.event_type === "HACKATHON";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            Edit Event
          </CardTitle>
          <p className="text-sm text-text-secondary mt-1">
            Admin editing - all fields are modifiable.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
                {success}
              </div>
            )}

            {/* Status toggles */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isApproved: !prev.isApproved }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  formData.isApproved
                    ? "bg-success/20 border-success/40 text-success"
                    : "bg-bg-secondary border-border text-text-secondary"
                )}
              >
                {formData.isApproved ? "Approved" : "Not Approved"}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isForeverMint: !prev.isForeverMint }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  formData.isForeverMint
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                    : "bg-bg-secondary border-border text-text-secondary"
                )}
              >
                {formData.isForeverMint ? "Forever Mint" : "Not Forever Mint"}
              </button>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="LIVE">Live</option>
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {(["MINT_EVENT", "ECOSYSTEM_MEETUP", "HACKATHON"] as EventType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, event_type: type }))}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                      formData.event_type === type
                        ? "bg-accent-primary text-white"
                        : "bg-bg-card text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {type === "MINT_EVENT" && <Calendar className="h-4 w-4" />}
                    {type === "ECOSYSTEM_MEETUP" && <Users className="h-4 w-4" />}
                    {type === "HACKATHON" && <Code2 className="h-4 w-4" />}
                    {type === "MINT_EVENT" ? "Mint" : type === "ECOSYSTEM_MEETUP" ? "Meetup" : "Hackathon"}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input name="title" value={formData.title} onChange={handleChange} required />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              />
            </div>

            {/* Host (meetup/hackathon) */}
            {isMeetupOrHackathon && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.event_type === "HACKATHON" ? "Organizer" : "Host"}
                </label>
                <Input name="host" value={formData.host} onChange={handleChange} />
              </div>
            )}

            {/* Prizes (hackathon) */}
            {formData.event_type === "HACKATHON" && (
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Prizes
                </label>
                <Input name="prizes" value={formData.prizes} onChange={handleChange} placeholder="e.g., $50,000 in HBAR" />
              </div>
            )}

            {/* Language (meetup/hackathon) */}
            {isMeetupOrHackathon && (
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Type (meetup/hackathon) */}
            {isMeetupOrHackathon && (
              <div>
                <label className="block text-sm font-medium mb-2">Location Type</label>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, location_type: "ONLINE" }))}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      formData.location_type === "ONLINE"
                        ? "bg-accent-primary text-white"
                        : "bg-bg-card text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Globe className="h-4 w-4" /> Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, location_type: "IN_PERSON" }))}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      formData.location_type === "IN_PERSON"
                        ? "bg-accent-primary text-white"
                        : "bg-bg-card text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <MapPin className="h-4 w-4" /> In Person
                  </button>
                </div>
              </div>
            )}

            {/* Location */}
            {isMeetupOrHackathon && formData.location_type === "IN_PERSON" && (
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Berlin, Germany" />
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input type="date" name="mintDate" value={formData.mintDate} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time (UTC)</label>
                <Input type="time" name="mintTime" value={formData.mintTime} onChange={handleChange} />
              </div>
            </div>

            {/* Mint Price (for mint events) */}
            <div>
              <label className="block text-sm font-medium mb-2">Mint Price</label>
              <Input name="mintPrice" value={formData.mintPrice} onChange={handleChange} placeholder="e.g., 100 HBAR or Free" />
            </div>

            {/* Supply */}
            <div>
              <label className="block text-sm font-medium mb-2">Supply</label>
              <Input type="number" name="supply" value={formData.supply} onChange={handleChange} placeholder="e.g., 10000" />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Cover Image</label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Links
              </label>
              <Input name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="Website URL" />
              <Input name="twitterUrl" value={formData.twitterUrl} onChange={handleChange} placeholder="Twitter/X URL" />
              <Input name="discordUrl" value={formData.discordUrl} onChange={handleChange} placeholder="Discord URL" />
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" loading={saving} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Link href="/admin/events">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
