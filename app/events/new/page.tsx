"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, ArrowLeft, Link as LinkIcon, Send, Plus, Trash2, Layers, Clock, MapPin, Globe, Users, Code2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { useWalletStore } from "@/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EventType = "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";

interface MintPhase {
  id: string;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  price: string;
  currency: "HBAR" | "USDC";
  supply: string;
  maxPerWallet: string;
  isWhitelist: boolean;
}

interface CustomLink {
  id: string;
  name: string;
  url: string;
}

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

const createEmptyPhase = (): MintPhase => ({
  id: crypto.randomUUID(),
  name: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  price: "",
  currency: "HBAR",
  supply: "",
  maxPerWallet: "",
  isWhitelist: false,
});

const createEmptyLink = (): CustomLink => ({
  id: crypto.randomUUID(),
  name: "",
  url: "",
});

export default function NewEventPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();

  const [eventType, setEventType] = React.useState<EventType>("MINT_EVENT");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [usePhases, setUsePhases] = React.useState(false);
  const [phases, setPhases] = React.useState<MintPhase[]>([createEmptyPhase()]);
  const [customLinks, setCustomLinks] = React.useState<CustomLink[]>([createEmptyLink()]);

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    mintDate: "",
    mintTime: "",
    endDate: "",
    endTime: "",
    mintPrice: "",
    mintCurrency: "HBAR" as "HBAR" | "USDC",
    supply: "",
    imageUrl: "",
    websiteUrl: "",
    twitterUrl: "",
    discordUrl: "",
    // Meetup / Hackathon fields
    host: "",
    language: "en",
    locationType: "online" as "online" | "in_person",
    location: "",
    prizes: "",
  });

  React.useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePhaseChange = (phaseId: string, field: keyof MintPhase, value: string | boolean) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId ? { ...phase, [field]: value } : phase
      )
    );
  };

  const handleLinkChange = (linkId: string, field: keyof CustomLink, value: string) => {
    setCustomLinks((prev) =>
      prev.map((link) =>
        link.id === linkId ? { ...link, [field]: value } : link
      )
    );
  };

  const addPhase = () => setPhases((prev) => [...prev, createEmptyPhase()]);
  const removePhase = (phaseId: string) => {
    if (phases.length > 1) setPhases((prev) => prev.filter((p) => p.id !== phaseId));
  };
  const addLink = () => setCustomLinks((prev) => [...prev, createEmptyLink()]);
  const removeLink = (linkId: string) => {
    if (customLinks.length > 1) setCustomLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.imageUrl) {
        throw new Error("Cover image is required");
      }
      if (!formData.title.trim()) {
        throw new Error("Title is required");
      }
      if (!formData.description.trim() || formData.description.trim().length < 10) {
        throw new Error("Description must be at least 10 characters");
      }

      if (eventType === "ECOSYSTEM_MEETUP" || eventType === "HACKATHON") {
        // Meetup / Hackathon validation
        if (!formData.host.trim()) throw new Error(eventType === "HACKATHON" ? "Organizer is required" : "Host is required");
        if (!formData.mintDate) throw new Error("Event date is required");

        if (formData.locationType === "in_person" && !formData.location.trim()) {
          throw new Error("Location is required for in-person events");
        }

        // Validate custom links
        const validLinks = customLinks.filter(l => l.name.trim() && l.url.trim());
        for (const link of validLinks) {
          try {
            new URL(link.url);
          } catch {
            throw new Error(`Invalid URL for link "${link.name}": ${link.url}`);
          }
        }

        const mintDateTime = new Date(`${formData.mintDate}T${formData.mintTime || "00:00"}Z`);
        const endDateTime = formData.endDate
          ? new Date(`${formData.endDate}T${formData.endTime || "23:59"}Z`)
          : null;

        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            mintDate: mintDateTime.toISOString(),
            mintPrice: "Free",
            imageUrl: formData.imageUrl || null,
            websiteUrl: formData.websiteUrl || null,
            twitterUrl: formData.twitterUrl || null,
            discordUrl: formData.discordUrl || null,
            eventType,
            host: formData.host,
            language: formData.language,
            locationType: formData.locationType === "in_person" ? "IN_PERSON" : "ONLINE",
            location: formData.location || null,
            endDate: endDateTime?.toISOString() || null,
            customLinks: validLinks.map(l => ({ name: l.name.trim(), url: l.url.trim() })),
            ...(eventType === "HACKATHON" && formData.prizes ? { prizes: formData.prizes } : {}),
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create event");

        if (user?.isAdmin) {
          router.push(`/events/${data.event.id}`);
        } else {
          router.push("/?submitted=true");
        }
      } else {
        // Mint Event (existing logic)
        let mintDateTime: Date;
        let phasesData: Array<{
          name: string;
          startDate: string;
          endDate: string | null;
          price: string;
          supply: number | null;
          maxPerWallet: number | null;
          isWhitelist: boolean;
          order: number;
        }> | null = null;

        if (usePhases && phases.length > 0) {
          for (const phase of phases) {
            if (!phase.name || !phase.startDate || !phase.price) {
              throw new Error("Each phase requires a name, start date, and price");
            }
          }
          const sortedPhases = [...phases].sort(
            (a, b) => new Date(`${a.startDate}T${a.startTime || "00:00"}Z`).getTime() -
                      new Date(`${b.startDate}T${b.startTime || "00:00"}Z`).getTime()
          );
          mintDateTime = new Date(`${sortedPhases[0].startDate}T${sortedPhases[0].startTime || "00:00"}Z`);
          phasesData = sortedPhases.map((phase, index) => ({
            name: phase.name,
            startDate: new Date(`${phase.startDate}T${phase.startTime || "00:00"}Z`).toISOString(),
            endDate: phase.endDate
              ? new Date(`${phase.endDate}T${phase.endTime || "23:59"}Z`).toISOString()
              : null,
            price: phase.currency === "USDC" ? `$${phase.price}` : `${phase.price} HBAR`,
            supply: phase.supply ? parseInt(phase.supply) : null,
            maxPerWallet: phase.maxPerWallet ? parseInt(phase.maxPerWallet) : null,
            isWhitelist: phase.isWhitelist,
            order: index,
          }));
        } else {
          if (!formData.mintDate) throw new Error("Start date is required");
          if (!formData.mintPrice) throw new Error("Mint price is required");
          mintDateTime = new Date(`${formData.mintDate}T${formData.mintTime || "00:00"}Z`);
        }

        const formattedPrice = usePhases && phases.length > 0
          ? (phases[0].currency === "USDC" ? `$${phases[0].price}` : `${phases[0].price} HBAR`)
          : (formData.mintCurrency === "USDC" ? `$${formData.mintPrice}` : `${formData.mintPrice} HBAR`);

        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            mintDate: mintDateTime.toISOString(),
            mintPrice: formattedPrice,
            supply: usePhases && phases.length > 0
              ? (phases[0].supply ? parseInt(phases[0].supply) : null)
              : (formData.supply ? parseInt(formData.supply) : null),
            imageUrl: formData.imageUrl || null,
            websiteUrl: formData.websiteUrl || null,
            twitterUrl: formData.twitterUrl || null,
            discordUrl: formData.discordUrl || null,
            phases: phasesData,
            eventType: "MINT_EVENT",
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create event");

        if (user?.isAdmin) {
          router.push(`/events/${data.event.id}`);
        } else {
          router.push("/?submitted=true");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            Submit New Event
          </CardTitle>
          {!user?.isAdmin && (
            <p className="text-sm text-text-secondary mt-1">
              Your event will be reviewed by an admin before publishing.
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
                {error}
              </div>
            )}

            {/* Event Type Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEventType("MINT_EVENT")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                    eventType === "MINT_EVENT"
                      ? "bg-accent-primary text-white"
                      : "bg-bg-card text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  Mint Event
                </button>
                <button
                  type="button"
                  onClick={() => setEventType("ECOSYSTEM_MEETUP")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                    eventType === "ECOSYSTEM_MEETUP"
                      ? "bg-accent-primary text-white"
                      : "bg-bg-card text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Meetup
                </button>
                <button
                  type="button"
                  onClick={() => setEventType("HACKATHON")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                    eventType === "HACKATHON"
                      ? "bg-accent-primary text-white"
                      : "bg-bg-card text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Code2 className="h-4 w-4" />
                  Hackathon
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {eventType === "MINT_EVENT" ? "Project Name" : eventType === "HACKATHON" ? "Hackathon Name" : "Event Title"} <span className="text-error">*</span>
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={eventType === "MINT_EVENT" ? "e.g., Hedera Punks" : eventType === "HACKATHON" ? "e.g., Hedera DeFi Hackathon" : "e.g., Hedera Community Call"}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={eventType === "MINT_EVENT" ? "Tell us about this project..." : eventType === "HACKATHON" ? "Describe this hackathon..." : "Describe this meetup or event..."}
                required
                rows={4}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              />
            </div>

            {/* ============ MEETUP / HACKATHON FIELDS ============ */}
            {(eventType === "ECOSYSTEM_MEETUP" || eventType === "HACKATHON") && (
              <>
                {/* Host / Organizer */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {eventType === "HACKATHON" ? "Organizer" : "Host"} <span className="text-error">*</span>
                  </label>
                  <Input
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder={eventType === "HACKATHON" ? "e.g., HBAR Foundation, Hashgraph" : "e.g., HBAR Foundation, Community DAO"}
                    required
                  />
                </div>

                {/* Prizes (Hackathon only) */}
                {eventType === "HACKATHON" && (
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Prizes
                    </label>
                    <Input
                      name="prizes"
                      value={formData.prizes}
                      onChange={handleChange}
                      placeholder="e.g., $50,000 in HBAR + ecosystem grants"
                    />
                  </div>
                )}

                {/* Language */}
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

                {/* Location Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <div className="flex rounded-xl border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, locationType: "online" }))}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                        formData.locationType === "online"
                          ? "bg-accent-primary text-white"
                          : "bg-bg-card text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <Globe className="h-4 w-4" />
                      Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, locationType: "in_person" }))}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                        formData.locationType === "in_person"
                          ? "bg-accent-primary text-white"
                          : "bg-bg-card text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <MapPin className="h-4 w-4" />
                      In Person
                    </button>
                  </div>
                </div>

                {/* Location (if in person) */}
                {formData.locationType === "in_person" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Location <span className="text-error">*</span>
                    </label>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Berlin, Germany"
                      required
                    />
                  </div>
                )}

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date <span className="text-error">*</span>
                    </label>
                    <Input
                      type="date"
                      name="mintDate"
                      value={formData.mintDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Time (UTC)
                    </label>
                    <Input
                      type="time"
                      name="mintTime"
                      value={formData.mintTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Time (UTC)</label>
                    <Input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Custom Links */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-accent-primary" />
                      Links
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={addLink} className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add Link
                    </Button>
                  </div>
                  {customLinks.map((link) => (
                    <div key={link.id} className="flex gap-2 items-start">
                      <div className="w-1/3">
                        <Input
                          value={link.name}
                          onChange={(e) => handleLinkChange(link.id, "name", e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={link.url}
                          onChange={(e) => handleLinkChange(link.id, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      {customLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(link.id)}
                          className="p-2 text-text-secondary hover:text-error transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ============ MINT EVENT FIELDS ============ */}
            {eventType === "MINT_EVENT" && (
              <>
                {/* Mint Phases Toggle */}
                <div className="p-4 rounded-lg bg-bg-secondary border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-accent-primary" />
                      <div>
                        <p className="font-medium">Multiple Mint Phases</p>
                        <p className="text-xs text-text-secondary">
                          Enable if your mint has multiple phases (WL, Public, etc.)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUsePhases(!usePhases)}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        usePhases ? "bg-accent-primary" : "bg-gray-600"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                          usePhases ? "translate-x-7" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Simple Mint Info */}
                {!usePhases && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Start Date <span className="text-error">*</span>
                        </label>
                        <Input type="date" name="mintDate" value={formData.mintDate} onChange={handleChange} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Start Time (UTC)</label>
                        <Input type="time" name="mintTime" value={formData.mintTime} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">End Date</label>
                        <Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">End Time (UTC)</label>
                        <Input type="time" name="endTime" value={formData.endTime} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Mint Price <span className="text-error">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input type="number" name="mintPrice" value={formData.mintPrice} onChange={handleChange} placeholder="100" required />
                          </div>
                          <div className="flex rounded-lg border border-border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, mintCurrency: "HBAR" }))}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                                formData.mintCurrency === "HBAR" ? "bg-accent-primary text-white" : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <HbarIcon className="h-4 w-4" />
                              HBAR
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, mintCurrency: "USDC" }))}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                                formData.mintCurrency === "USDC" ? "bg-accent-primary text-white" : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <UsdcIcon className="h-4 w-4" />
                              USDC
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Supply</label>
                        <Input type="number" name="supply" value={formData.supply} onChange={handleChange} placeholder="e.g., 10000" />
                      </div>
                    </div>
                  </>
                )}

                {/* Mint Phases */}
                {usePhases && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-accent-primary" />
                        Mint Phases
                      </label>
                      <Button type="button" variant="outline" size="sm" onClick={addPhase} className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add Phase
                      </Button>
                    </div>
                    {phases.map((phase, index) => (
                      <div key={phase.id} className="p-4 rounded-lg border border-border bg-bg-card space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent-primary">Phase {index + 1}</span>
                          {phases.length > 1 && (
                            <button type="button" onClick={() => removePhase(phase.id)} className="p-1 text-text-secondary hover:text-error transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Phase Name <span className="text-error">*</span></label>
                          <Input value={phase.name} onChange={(e) => handlePhaseChange(phase.id, "name", e.target.value)} placeholder="e.g., Whitelist, Public Sale" required={usePhases} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Start Date <span className="text-error">*</span></label>
                            <Input type="date" value={phase.startDate} onChange={(e) => handlePhaseChange(phase.id, "startDate", e.target.value)} required={usePhases} />
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Start Time (UTC)</label>
                            <Input type="time" value={phase.startTime} onChange={(e) => handlePhaseChange(phase.id, "startTime", e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">End Date</label>
                            <Input type="date" value={phase.endDate} onChange={(e) => handlePhaseChange(phase.id, "endDate", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">End Time (UTC)</label>
                            <Input type="time" value={phase.endTime} onChange={(e) => handlePhaseChange(phase.id, "endTime", e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Price <span className="text-error">*</span></label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input type="number" value={phase.price} onChange={(e) => handlePhaseChange(phase.id, "price", e.target.value)} placeholder="100" required={usePhases} />
                            </div>
                            <div className="flex rounded-lg border border-border overflow-hidden">
                              <button type="button" onClick={() => handlePhaseChange(phase.id, "currency", "HBAR")} className={cn("flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors", phase.currency === "HBAR" ? "bg-accent-primary text-white" : "bg-bg-secondary text-text-secondary hover:text-text-primary")}>
                                <HbarIcon className="h-3 w-3" />HBAR
                              </button>
                              <button type="button" onClick={() => handlePhaseChange(phase.id, "currency", "USDC")} className={cn("flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors", phase.currency === "USDC" ? "bg-accent-primary text-white" : "bg-bg-secondary text-text-secondary hover:text-text-primary")}>
                                <UsdcIcon className="h-3 w-3" />USDC
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Supply</label>
                            <Input type="number" value={phase.supply} onChange={(e) => handlePhaseChange(phase.id, "supply", e.target.value)} placeholder="1000" />
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Max/Wallet</label>
                            <Input type="number" value={phase.maxPerWallet} onChange={(e) => handlePhaseChange(phase.id, "maxPerWallet", e.target.value)} placeholder="5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => handlePhaseChange(phase.id, "isWhitelist", !phase.isWhitelist)} className={cn("relative w-11 h-6 rounded-full transition-colors", phase.isWhitelist ? "bg-accent-primary" : "bg-gray-600")}>
                            <span className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform", phase.isWhitelist ? "translate-x-5" : "translate-x-0")} />
                          </button>
                          <span className="text-sm text-text-secondary">Whitelist Only</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Cover Image <span className="text-error">*</span>
              </label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              />
              <p className="text-xs text-text-secondary mt-2">
                Recommended: 800x400px (JPG, PNG, GIF, WebP, max 3MB)
              </p>
            </div>

            {/* Social Links (for both types but meetup also has custom links above) */}
            {eventType === "MINT_EVENT" && (
              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  <LinkIcon className="h-4 w-4 inline mr-1" />
                  Social Links
                </label>
                <Input name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="Website URL" />
                <Input name="twitterUrl" value={formData.twitterUrl} onChange={handleChange} placeholder="Twitter/X URL" />
                <Input name="discordUrl" value={formData.discordUrl} onChange={handleChange} placeholder="Discord URL" />
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" loading={loading} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                {user?.isAdmin ? "Publish Event" : "Submit for Review"}
              </Button>
              <Link href="/">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
