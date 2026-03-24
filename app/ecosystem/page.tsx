"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Globe,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Buildings, LinkedinLogo } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useEcosystemProjects } from "@/lib/swr";
import { useWalletStore } from "@/store";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/CountryFlag";

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "DEFI", label: "DeFi" },
  { value: "TOOLS", label: "Tools" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "DATA", label: "Data" },
  { value: "COMMUNITY", label: "Community" },
  { value: "WALLET", label: "Wallet" },
  { value: "BRIDGE", label: "Bridge" },
  { value: "GAMING", label: "Gaming" },
  { value: "NFT", label: "NFT" },
  { value: "EDUCATION", label: "Education" },
  { value: "INFRASTRUCTURE", label: "Infra" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  DEFI: "bg-green-500/15 text-green-400",
  TOOLS: "bg-sky-500/15 text-sky-400",
  MARKETPLACE: "bg-purple-500/15 text-purple-400",
  DATA: "bg-amber-500/15 text-amber-400",
  COMMUNITY: "bg-pink-500/15 text-pink-400",
  WALLET: "bg-teal-500/15 text-teal-400",
  BRIDGE: "bg-orange-500/15 text-orange-400",
  GAMING: "bg-red-500/15 text-red-400",
  NFT: "bg-violet-500/15 text-violet-400",
  EDUCATION: "bg-blue-500/15 text-blue-400",
  INFRASTRUCTURE: "bg-slate-500/15 text-slate-400",
  OTHER: "bg-gray-500/15 text-gray-400",
};

function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label || cat;
}

export default function EcosystemPage() {
  const { isConnected } = useWalletStore();
  const [category, setCategory] = React.useState("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const headerRef = useReveal();
  const filtersRef = useReveal();
  const contentRef = useReveal();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useEcosystemProjects(category, debouncedSearch);
  const projects = data?.projects || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 reveal-delay-1">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
                Hedera Network
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Ecosystem
              </h1>
            </div>
            <div className="flex items-center gap-3 reveal-delay-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-sm">
                <Buildings className="h-3.5 w-3.5 text-brand" weight="duotone" />
                <span className="font-bold text-text-primary font-mono tabular-nums">{projects.length}</span>
                <span className="text-text-tertiary text-xs">projects</span>
              </div>
              {isConnected && (
                <Link href="/ecosystem/apply">
                  <Button className="gap-2 text-sm">
                    <Plus className="h-4 w-4" />
                    Apply
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="reveal-delay-3">
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pb-8">
        {/* Category Filters */}
        <div ref={filtersRef} className="reveal mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-3 bg-bg-card border border-border rounded-xl overflow-x-auto scrollbar-hide reveal-delay-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-150 whitespace-nowrap",
                    category === cat.value
                      ? "bg-brand/10 text-brand"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Grid */}
        <div ref={contentRef} className="reveal">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 reveal-delay-1">
              <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
              <p className="text-text-secondary text-sm">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 reveal-delay-1">
              <div className="w-16 h-16 rounded-xl bg-bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
                <Buildings className="h-8 w-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">No projects found</h3>
              <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
                {debouncedSearch ? "Try adjusting your search" : "Be the first to apply!"}
              </p>
              {isConnected && (
                <Link href="/ecosystem/apply">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Apply Your Project
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 reveal-delay-1">
              {projects.map((project: any) => {
                return (
                  <div
                    key={project.id}
                    className="group rounded-xl border border-border bg-bg-card overflow-hidden hover:border-text-tertiary/30 transition-all duration-200"
                  >
                    {/* Card Header */}
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary ring-1 ring-border">
                        {project.logoUrl ? (
                          <img
                            src={project.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-text-tertiary">
                            {project.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {(project.categories || []).map((cat: string) => (
                          <span key={cat} className={cn(
                            "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER
                          )}>
                            {getCategoryLabel(cat)}
                          </span>
                        ))}
                          {project.countryCode && (
                            <CountryFlag code={project.countryCode} size="xs" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-text-primary truncate group-hover:text-brand transition-colors">
                          {project.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="px-4 pb-3">
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    {/* Links Footer */}
                    <div className="px-4 pb-4 flex items-center gap-2">
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-brand transition-colors"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      {project.twitterUrl && (
                        <a
                          href={project.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-brand transition-colors"
                        >
                          <span className="font-bold text-[11px]">𝕏</span>
                        </a>
                      )}
                      {project.discordUrl && (
                        <a
                          href={project.discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-brand transition-colors"
                        >
                          Discord
                        </a>
                      )}
                      {project.linkedinUrl && (
                        <a
                          href={project.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-brand transition-colors"
                        >
                          <LinkedinLogo className="h-3 w-3" weight="fill" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
