"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, ArrowLeft, Link as LinkIcon, Send, Plus, Trash2, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { useWalletStore } from "@/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

const categories = [
  { value: "pfp", label: "PFP", color: "bg-purple-500" },
  { value: "art", label: "Art", color: "bg-blue-500" },
  { value: "gaming", label: "Gaming", color: "bg-green-500" },
  { value: "utility", label: "Utility", color: "bg-orange-500" },
  { value: "metaverse", label: "Metaverse", color: "bg-pink-500" },
];

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

export default function NewEventPage() {
  const router = useRouter();
  const { user, isConnected } = useWalletStore();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [usePhases, setUsePhases] = React.useState(false);
  const [phases, setPhases] = React.useState<MintPhase[]>([createEmptyPhase()]);

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
    category: "pfp",
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

  const addPhase = () => {
    setPhases((prev) => [...prev, createEmptyPhase()]);
  };

  const removePhase = (phaseId: string) => {
    if (phases.length > 1) {
      setPhases((prev) => prev.filter((p) => p.id !== phaseId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate required image
      if (!formData.imageUrl) {
        throw new Error("Cover image is required");
      }

      // Determine mint date - use first phase date if using phases, otherwise use form data
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
        // Validate phases
        for (const phase of phases) {
          if (!phase.name || !phase.startDate || !phase.price) {
            throw new Error("Each phase requires a name, start date, and price");
          }
        }

        // Sort phases by start date and use the earliest as mint date
        const sortedPhases = [...phases].sort(
          (a, b) => new Date(`${a.startDate}T${a.startTime || "00:00"}`).getTime() -
                    new Date(`${b.startDate}T${b.startTime || "00:00"}`).getTime()
        );

        mintDateTime = new Date(`${sortedPhases[0].startDate}T${sortedPhases[0].startTime || "00:00"}`);

        phasesData = sortedPhases.map((phase, index) => ({
          name: phase.name,
          startDate: new Date(`${phase.startDate}T${phase.startTime || "00:00"}`).toISOString(),
          endDate: phase.endDate
            ? new Date(`${phase.endDate}T${phase.endTime || "23:59"}`).toISOString()
            : null,
          price: phase.currency === "USDC" ? `$${phase.price}` : `${phase.price} HBAR`,
          supply: phase.supply ? parseInt(phase.supply) : null,
          maxPerWallet: phase.maxPerWallet ? parseInt(phase.maxPerWallet) : null,
          isWhitelist: phase.isWhitelist,
          order: index,
        }));
      } else {
        mintDateTime = new Date(`${formData.mintDate}T${formData.mintTime || "00:00"}`);
      }

      // Format the mint price with currency
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
          category: formData.category,
          phases: phasesData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      // Redirect based on user role
      if (user?.isAdmin) {
        router.push(`/events/${data.event.id}`);
      } else {
        router.push("/?submitted=true");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calendar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            Submit New Mint Event
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

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Project Name <span className="text-error">*</span>
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Hedera Punks"
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
                placeholder="Tell us about this NFT project..."
                required
                rows={4}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-error">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat.value }))}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      formData.category === cat.value
                        ? `${cat.color} text-white`
                        : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

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

            {/* Simple Mint Info (when phases disabled) */}
            {!usePhases && (
              <>
                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Date <span className="text-error">*</span>
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
                    <label className="block text-sm font-medium mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      End Time (UTC)
                    </label>
                    <Input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Price & Supply */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mint Price <span className="text-error">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          name="mintPrice"
                          value={formData.mintPrice}
                          onChange={handleChange}
                          placeholder="100"
                          required
                        />
                      </div>
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, mintCurrency: "HBAR" }))}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                            formData.mintCurrency === "HBAR"
                              ? "bg-accent-primary text-white"
                              : "bg-bg-secondary text-text-secondary hover:text-text-primary"
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
                            formData.mintCurrency === "USDC"
                              ? "bg-accent-primary text-white"
                              : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <UsdcIcon className="h-4 w-4" />
                          USDC
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Supply
                    </label>
                    <Input
                      type="number"
                      name="supply"
                      value={formData.supply}
                      onChange={handleChange}
                      placeholder="e.g., 10000"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Mint Phases (when enabled) */}
            {usePhases && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent-primary" />
                    Mint Phases
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhase}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Phase
                  </Button>
                </div>

                {phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className="p-4 rounded-lg border border-border bg-bg-card space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-accent-primary">
                        Phase {index + 1}
                      </span>
                      {phases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhase(phase.id)}
                          className="p-1 text-text-secondary hover:text-error transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Phase Name */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        Phase Name <span className="text-error">*</span>
                      </label>
                      <Input
                        value={phase.name}
                        onChange={(e) => handlePhaseChange(phase.id, "name", e.target.value)}
                        placeholder="e.g., Whitelist, Public Sale"
                        required={usePhases}
                      />
                    </div>

                    {/* Start Date/Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Start Date <span className="text-error">*</span>
                        </label>
                        <Input
                          type="date"
                          value={phase.startDate}
                          onChange={(e) => handlePhaseChange(phase.id, "startDate", e.target.value)}
                          required={usePhases}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Start Time (UTC)
                        </label>
                        <Input
                          type="time"
                          value={phase.startTime}
                          onChange={(e) => handlePhaseChange(phase.id, "startTime", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* End Date/Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={phase.endDate}
                          onChange={(e) => handlePhaseChange(phase.id, "endDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          End Time (UTC)
                        </label>
                        <Input
                          type="time"
                          value={phase.endTime}
                          onChange={(e) => handlePhaseChange(phase.id, "endTime", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Price with Currency */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        Price <span className="text-error">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={phase.price}
                            onChange={(e) => handlePhaseChange(phase.id, "price", e.target.value)}
                            placeholder="100"
                            required={usePhases}
                          />
                        </div>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handlePhaseChange(phase.id, "currency", "HBAR")}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors",
                              phase.currency === "HBAR"
                                ? "bg-accent-primary text-white"
                                : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                            )}
                          >
                            <HbarIcon className="h-3 w-3" />
                            HBAR
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePhaseChange(phase.id, "currency", "USDC")}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors",
                              phase.currency === "USDC"
                                ? "bg-accent-primary text-white"
                                : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                            )}
                          >
                            <UsdcIcon className="h-3 w-3" />
                            USDC
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Supply & Max per Wallet */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Supply
                        </label>
                        <Input
                          type="number"
                          value={phase.supply}
                          onChange={(e) => handlePhaseChange(phase.id, "supply", e.target.value)}
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Max/Wallet
                        </label>
                        <Input
                          type="number"
                          value={phase.maxPerWallet}
                          onChange={(e) => handlePhaseChange(phase.id, "maxPerWallet", e.target.value)}
                          placeholder="5"
                        />
                      </div>
                    </div>

                    {/* Whitelist Toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handlePhaseChange(phase.id, "isWhitelist", !phase.isWhitelist)}
                        className={cn(
                          "relative w-11 h-6 rounded-full transition-colors",
                          phase.isWhitelist ? "bg-accent-primary" : "bg-gray-600"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                            phase.isWhitelist ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm text-text-secondary">
                        Whitelist Only
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Links */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Social Links
              </label>

              <Input
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="Website URL"
              />

              <Input
                name="twitterUrl"
                value={formData.twitterUrl}
                onChange={handleChange}
                placeholder="Twitter/X URL"
              />

              <Input
                name="discordUrl"
                value={formData.discordUrl}
                onChange={handleChange}
                placeholder="Discord URL"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                loading={loading}
                className="flex-1 gap-2"
              >
                <Send className="h-4 w-4" />
                {user?.isAdmin ? "Publish Event" : "Submit for Review"}
              </Button>

              <Link href="/">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
