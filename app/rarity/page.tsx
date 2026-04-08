"use client";

import * as React from "react";
import {
  Search,
  Loader2,
  Diamond,
  ChevronDown,
  ArrowUpDown,
  X,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TraitDetail {
  trait_type: string;
  value: string;
  rarity: number;
  count: number;
}

interface RankedNft {
  rank: number;
  serial: number;
  name: string;
  image: string | null;
  score: number;
  traits: TraitDetail[];
}

interface TraitStats {
  [traitType: string]: {
    weight: number;
    values: { value: string; count: number; pct: number }[];
  };
}

interface RarityData {
  ranked: RankedNft[];
  traitStats: TraitStats;
  totalSupply: number;
}

const RARITY_TIERS = [
  { label: "Mythic", minPct: -1, color: "text-teal-400", bg: "bg-teal-400", border: "border-teal-400/40" },
  { label: "Legendary", minPct: 95, color: "text-amber-400", bg: "bg-amber-400", border: "border-amber-400/40" },
  { label: "Epic", minPct: 85, color: "text-purple-400", bg: "bg-purple-400", border: "border-purple-400/40" },
  { label: "Rare", minPct: 70, color: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400/40" },
  { label: "Uncommon", minPct: 50, color: "text-green-400", bg: "bg-green-400", border: "border-green-400/40" },
  { label: "Common", minPct: 0, color: "text-text-tertiary", bg: "bg-text-tertiary", border: "border-border" },
];

const TIER_COLORS: Record<string, string> = {
  Mythic: "#2dd4bf",
  Legendary: "#fbbf24",
  Epic: "#a78bfa",
  Rare: "#fb923c",
  Uncommon: "#34d399",
  Common: "#666666",
};

function getRarityTier(rank: number, total: number) {
  // Mythic = only rank 1 (the 1-of-1 specials)
  if (rank === 1) return RARITY_TIERS[0];
  const pct = ((total - rank) / total) * 100;
  return RARITY_TIERS.find((t) => t.minPct >= 0 && pct >= t.minPct) || RARITY_TIERS[RARITY_TIERS.length - 1];
}

function resolveImage(img: string | null) {
  if (!img) return null;
  if (img.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${img.replace("ipfs://", "")}`;
  if (img.startsWith("ar://")) return `https://arweave.net/${img.replace("ar://", "")}`;
  return img;
}

const TOKEN_ID = "0.0.7235629";

export default function RarityPage() {
  const [data, setData] = React.useState<RarityData | null>(null);
  const [listings, setListings] = React.useState<Record<number, { price: number; currency: string; url: string }>>({});
  const [tokenInfo, setTokenInfo] = React.useState<{ totalSupply: number; maxSupply: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedNft, setSelectedNft] = React.useState<RankedNft | null>(null);
  const [showTraitStats, setShowTraitStats] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"rank" | "serial" | "price">("rank");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [showOnlyListed, setShowOnlyListed] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [rarityRes, listingsRes] = await Promise.all([
          fetch(`/data/rarity-${TOKEN_ID}.json`),
          fetch("/api/rarity/listings").catch(() => null),
        ]);
        if (!rarityRes.ok) throw new Error("Failed to load rarity data");
        setData(await rarityRes.json());
        if (listingsRes?.ok) {
          const l = await listingsRes.json();
          setListings(l.listings || {});
        }
        // Fetch circulating supply from mirror node
        try {
          const tokenRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/tokens/${TOKEN_ID}`);
          if (tokenRes.ok) {
            const t = await tokenRes.json();
            setTokenInfo({
              totalSupply: parseInt(t.total_supply) || 0,
              maxSupply: parseInt(t.max_supply) || 0,
            });
          }
        } catch { /* ignore */ }
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close modal on escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNft(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredNfts = React.useMemo(() => {
    if (!data) return [];
    let nfts = data.ranked;
    if (search) {
      const q = search.toLowerCase();
      nfts = nfts.filter(
        (n) =>
          String(n.serial).includes(q) ||
          n.name.toLowerCase().includes(q) ||
          n.traits.some((t) => t.value.toLowerCase().includes(q))
      );
    }
    if (showOnlyListed) {
      nfts = nfts.filter((n) => listings[n.serial]);
    }
    if (sortBy === "rank") {
      nfts = [...nfts].sort((a, b) => sortDir === "asc" ? a.rank - b.rank : b.rank - a.rank);
    } else if (sortBy === "serial") {
      nfts = [...nfts].sort((a, b) => sortDir === "asc" ? a.serial - b.serial : b.serial - a.serial);
    } else if (sortBy === "price") {
      nfts = [...nfts].sort((a, b) => {
        const pa = listings[a.serial]?.price ?? Infinity;
        const pb = listings[b.serial]?.price ?? Infinity;
        return sortDir === "asc" ? pa - pb : pb - pa;
      });
    }
    return nfts;
  }, [data, search, sortBy, sortDir, showOnlyListed, listings]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
            Tool
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-1">
            NFT Rarity Checker
          </h1>
          <p className="text-sm text-text-secondary">
            Santuario Hedera — Trait rarity ranking
          </p>

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Fetching and analyzing NFTs...</p>
          <p className="text-text-tertiary text-xs mt-1">This may take a minute</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
              <Diamond className="h-3.5 w-3.5 text-brand" />
              <span className="font-bold font-mono text-text-primary">{data.totalSupply}</span>
              <span className="text-text-tertiary text-xs">NFTs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
              <span className="font-bold font-mono text-text-primary">{Object.keys(data.traitStats).length}</span>
              <span className="text-text-tertiary text-xs">trait types</span>
            </div>
            <button
              onClick={() => setShowTraitStats(!showTraitStats)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-secondary hover:text-brand transition-colors"
            >
              Trait breakdown
              <ChevronDown className={cn("h-3 w-3 transition-transform", showTraitStats && "rotate-180")} />
            </button>
            {tokenInfo && (
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm">
                <span className="text-text-tertiary text-xs">Circulating:</span>
                <span className="font-bold font-mono text-text-primary">{tokenInfo.totalSupply}</span>
                <span className="text-text-tertiary text-xs">/</span>
                <span className="font-bold font-mono text-text-primary">{tokenInfo.maxSupply}</span>
              </div>
            )}
          </div>

          {/* Tier legend */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {RARITY_TIERS.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-card border border-border text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[t.label] }} />
                <span className="font-semibold" style={{ color: TIER_COLORS[t.label] }}>{t.label}</span>
                <span className="text-text-tertiary font-mono">
                  {t.label === "Mythic" ? "Rank 1" : t.label === "Common" ? "<50%" : `Top ${100 - t.minPct}%`}
                </span>
              </div>
            ))}
          </div>

          {/* Trait stats panel */}
          {showTraitStats && (
            <div className="mb-6 rounded-xl bg-bg-card border border-border overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Trait Distribution</span>
                <span className="text-[10px] text-text-tertiary font-mono">{data.totalSupply} NFTs · {Object.keys(data.traitStats).length} traits</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {Object.entries(data.traitStats).map(([traitType, stat]) => (
                  <div key={traitType} className="p-4">
                    {/* Trait header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{traitType}</span>
                        <span className="text-[10px] text-text-tertiary font-mono">{stat.values.length} values</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">{stat.weight}%</span>
                    </div>
                    {/* Values */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {stat.values.map((v) => {
                        const rarityColor =
                          v.pct <= 2 ? "#fbbf24" :
                          v.pct <= 5 ? "#a78bfa" :
                          v.pct <= 15 ? "#fb923c" :
                          v.pct <= 30 ? "#34d399" :
                          "#555";
                        return (
                          <div key={v.value} className="group">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] text-text-secondary truncate flex-1 mr-2">{v.value}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-mono text-text-tertiary">{v.count}</span>
                                <span className="text-[10px] font-mono font-semibold tabular-nums w-11 text-right" style={{ color: rarityColor }}>{v.pct}%</span>
                              </div>
                            </div>
                            <div className="w-full h-1 rounded-full bg-bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.max(v.pct, 1)}%`, backgroundColor: rarityColor }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by serial, name, or trait..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-bg-card border border-border text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "rank" | "serial" | "price")}
                className="px-2 py-2 bg-bg-card text-xs text-text-secondary focus:outline-none cursor-pointer appearance-none pr-6"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
              >
                <option value="rank">Rank</option>
                <option value="serial">Serial</option>
                {showOnlyListed && <option value="price">Price</option>}
              </select>
              <button
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                className="px-2 py-2 bg-bg-card text-text-secondary hover:text-brand transition-colors border-l border-border"
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                {sortDir === "asc" ? (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                ) : (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
                )}
              </button>
            </div>
            {/* Filter */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                onClick={() => { setShowOnlyListed(false); if (sortBy === "price") setSortBy("rank"); }}
                className={cn(
                  "px-3 py-2 transition-colors",
                  !showOnlyListed ? "bg-brand/20 text-brand" : "bg-bg-card text-text-secondary hover:text-brand"
                )}
              >
                All
              </button>
              <button
                onClick={() => setShowOnlyListed(true)}
                className={cn(
                  "px-3 py-2 transition-colors flex items-center gap-1 border-l border-border",
                  showOnlyListed ? "bg-emerald-600/20 text-emerald-400" : "bg-bg-card text-text-secondary hover:text-brand"
                )}
              >
                Listed ({Object.keys(listings).length})
              </button>
            </div>
            <span className="text-[11px] text-text-tertiary font-mono">{filteredNfts.length} results</span>
          </div>

          {/* NFT Image Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
            {filteredNfts.map((nft) => {
              const tier = getRarityTier(nft.rank, data.totalSupply);
              const imgUrl = resolveImage(nft.image);
              const listing = listings[nft.serial];

              return (
                <button
                  key={nft.serial}
                  onClick={() => setSelectedNft(nft)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 hover:z-10 hover:shadow-lg",
                    tier.border
                  )}
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                      <span className="text-text-tertiary text-[10px] font-mono font-bold">#{nft.serial}</span>
                    </div>
                  )}
                  {/* Listed banner */}
                  {listing && (
                    <div className="absolute top-0 inset-x-0 bg-emerald-600/90 text-white text-center py-0.5 text-[8px] font-bold font-mono flex items-center justify-center gap-1">
                      Listed · {listing.price} <img src="/hbar-logo.png" alt="HBAR" className="h-3 w-3 inline-block rounded-full" />
                    </div>
                  )}
                  {/* Tier + Rank bottom right, Serial top right (below banner if listed) */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 px-1">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-mono text-white/80 font-medium">#{nft.serial}</span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: TIER_COLORS[tier.label] }}>{tier.label}</span>
                        <span className={cn("px-1 py-0.5 rounded text-[7px] font-bold font-mono text-white leading-none flex items-center gap-0.5", tier.bg)}>
                          <Trophy className="h-1.5 w-1.5" />{nft.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNft && data && (() => {
        const tier = getRarityTier(selectedNft.rank, data.totalSupply);
        const tierHex = TIER_COLORS[tier.label] || "#666";
        const imgUrl = resolveImage(selectedNft.image);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedNft(null)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-bg-card border border-border overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedNft(null)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image + rank overlay */}
              <div className="relative">
                {imgUrl ? (
                  <img src={imgUrl} alt={selectedNft.name} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-bg-secondary flex items-center justify-center">
                    <Diamond className="h-16 w-16 text-text-tertiary/20" />
                  </div>
                )}
                {/* Bottom gradient overlay with rank info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-4 px-5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-white leading-tight">{selectedNft.name}</h2>
                      <p className="text-[11px] text-white/50 font-mono">Serial #{selectedNft.serial}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${tierHex}20`, color: tierHex, border: `1px solid ${tierHex}40` }}
                      >
                        {tier.label}
                      </span>
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded font-black font-mono text-sm"
                        style={{ backgroundColor: `${tierHex}20`, color: tierHex, border: `1px solid ${tierHex}40` }}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        {selectedNft.rank}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score bar + Buy */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Diamond className="h-4 w-4" style={{ color: tierHex }} />
                  <span className="text-base font-bold font-mono text-text-primary tabular-nums">{selectedNft.score}</span>
                  <span className="text-xs text-text-tertiary">rarity score</span>
                  <span className="text-xs text-text-tertiary font-mono">· {selectedNft.rank} / {data.totalSupply}</span>
                </div>
                {listings[selectedNft.serial] ? (
                  <a
                    href={listings[selectedNft.serial].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                  >
                    {listings[selectedNft.serial].price} <img src="/hbar-logo.png" alt="HBAR" className="h-3.5 w-3.5 rounded-full" /> · Buy on SentX
                  </a>
                ) : (
                  <span className="text-[11px] text-text-tertiary">Not listed</span>
                )}
              </div>

              {/* Traits */}
              <div className="p-4 space-y-1.5">
                {selectedNft.traits.map((t) => {
                  const freq = t.count / data.totalSupply;
                  const barColor =
                    t.rarity >= 95 ? "#fbbf24" :
                    t.rarity >= 85 ? "#a78bfa" :
                    t.rarity >= 70 ? "#fb923c" :
                    t.rarity >= 50 ? "#34d399" :
                    "#666";

                  return (
                    <div key={t.trait_type} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-secondary/50">
                      {/* Trait type + value */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-text-tertiary">{t.trait_type}</span>
                          <span className="text-[10px] text-text-tertiary font-mono">({t.count})</span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary truncate">{t.value}</p>
                      </div>
                      {/* Bar + percentage */}
                      <div className="w-24 flex-shrink-0">
                        <div className="flex items-center justify-end mb-1">
                          <span className="text-xs font-bold font-mono tabular-nums" style={{ color: barColor }}>
                            {t.rarity}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(t.rarity, 100)}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <p className="text-[9px] text-text-tertiary font-mono text-right mt-0.5">
                          {(freq * 100).toFixed(1)}% have this
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
