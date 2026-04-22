"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { TwitterLogo, DiscordLogo, TelegramLogo, LinkedinLogo } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { CountrySelector } from "@/components/community/CountrySelector";
import { useWalletStore } from "@/store";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "DEFI", label: "DeFi" },
  { value: "TOOLS", label: "Tools" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "DATA", label: "Data & Analytics" },
  { value: "COMMUNITY", label: "Community" },
  { value: "WALLET", label: "Wallet" },
  { value: "BRIDGE", label: "Bridge" },
  { value: "GAMING", label: "Gaming" },
  { value: "NFT", label: "NFT" },
  { value: "EDUCATION", label: "Education" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "OTHER", label: "Other" },
];

export default function EcosystemApplyPage() {
  const router = useRouter();
  const { isConnected } = useWalletStore();
  const headerRef = useReveal();
  const formRef = useReveal();

  const [formData, setFormData] = React.useState({
    name: "",
    categories: [] as string[],
    countryCode: "",
    logoUrl: "",
    description: "",
    websiteUrl: "",
    twitterUrl: "",
    discordUrl: "",
    telegramUrl: "",
    linkedinUrl: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to submit");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Connect Your Wallet</h2>
          <p className="text-text-secondary text-sm">You need to connect your wallet to apply.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Application Submitted!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Your project is pending admin review. Once approved, it will appear in the Ecosystem directory and on the HashWorld globe.
          </p>
          <Button onClick={() => router.push("/ecosystem")} className="gap-2">
            View Ecosystem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-2xl mx-auto px-3 sm:px-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4 reveal-delay-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="reveal-delay-2">
            <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary mb-2">
              Ecosystem
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
              Apply Your Project
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              Submit your project to be listed in the Hedera Ecosystem directory. Approved projects will also appear on the HashWorld globe.
            </p>
          </div>
        </div>
      </div>

      <div ref={formRef} className="reveal max-w-2xl mx-auto px-3 sm:px-6 pb-12">
        <form onSubmit={handleSubmit} className="space-y-5 reveal-delay-1">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Project Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. SaucerSwap"
              required
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Categories *</label>
            <p className="text-[10px] text-text-tertiary mb-2">Select one or more categories that describe your project.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = formData.categories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        categories: isSelected
                          ? prev.categories.filter((c) => c !== cat.value)
                          : [...prev.categories, cat.value],
                      }));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      isSelected
                        ? "bg-brand/10 text-brand border-brand/30"
                        : "bg-bg-card text-text-secondary border-border hover:border-text-tertiary"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {formData.categories.length === 0 && (
              <input type="text" required value="" onChange={() => {}} className="sr-only" tabIndex={-1} />
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Country *</label>
            <CountrySelector
              value={formData.countryCode}
              onChange={(code) => setFormData((prev) => ({ ...prev, countryCode: code }))}
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Project Logo *</label>
            <ImageUpload
              value={formData.logoUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What does your project do? How does it contribute to the Hedera ecosystem?"
              rows={4}
              required
              minLength={20}
              maxLength={1000}
              className="w-full rounded-[10px] border border-[var(--card-border)] bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand resize-none"
            />
            <p className="text-[10px] text-text-tertiary mt-1 text-right">
              {formData.description.length} / 1000
            </p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Website *</label>
            <Input
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleChange}
              placeholder="https://yourproject.com"
              icon={<Globe className="h-4 w-4" />}
              required
              type="url"
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Twitter / X</label>
              <Input
                name="twitterUrl"
                value={formData.twitterUrl}
                onChange={handleChange}
                placeholder="https://x.com/..."
                icon={<TwitterLogo className="h-4 w-4" weight="fill" />}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Discord</label>
              <Input
                name="discordUrl"
                value={formData.discordUrl}
                onChange={handleChange}
                placeholder="https://discord.gg/..."
                icon={<DiscordLogo className="h-4 w-4" weight="fill" />}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Telegram</label>
              <Input
                name="telegramUrl"
                value={formData.telegramUrl}
                onChange={handleChange}
                placeholder="https://t.me/..."
                icon={<TelegramLogo className="h-4 w-4" weight="fill" />}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">LinkedIn</label>
              <Input
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/..."
                icon={<LinkedinLogo className="h-4 w-4" weight="fill" />}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" loading={submitting} className="w-full">
            Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
}
