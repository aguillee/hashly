"use client";

import * as React from "react";
import {
  Trophy,
  Medal,
  Crown,
  ThumbsUp,
  ThumbsDown,
  Users,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  TrendingDown,
  Plus,
  X,
  Coins,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toaster";
import { ShareToXButton } from "@/components/ui/ShareToXButton";
import { useVoteLimitContext } from "@/contexts/VoteLimitContext";
import { mutate } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";

interface Collection {
  id: string;
  tokenAddress: string;
  name: string;
  image: string | null;
  owners: number;
  supply: number;
  totalVotes: number;
  rank: number;
  userVote: { voteWeight: number } | null;
}

interface Token {
  id: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  icon: string | null;
  totalVotes: number;
  rank: number;
  userVote: { voteWeight: number } | null;
  priceUsd?: number | null;
  marketCap?: number | null;
}

type ProjectType = "nft" | "token";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ProjectsPage() {
  const [topCollections, setTopCollections] = React.useState<Collection[]>([]);
  const [worstCollections, setWorstCollections] = React.useState<Collection[]>([]);
  const [searchResults, setSearchResults] = React.useState<Collection[]>([]);
  const [totalCollections, setTotalCollections] = React.useState(0);

  const [topTokens, setTopTokens] = React.useState<Token[]>([]);
  const [worstTokens, setWorstTokens] = React.useState<Token[]>([]);
  const [tokenSearchResults, setTokenSearchResults] = React.useState<Token[]>([]);
  const [totalTokens, setTotalTokens] = React.useState(0);

  const [loading, setLoading] = React.useState(true);
  const [loadingTokens, setLoadingTokens] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [votingId, setVotingId] = React.useState<string | null>(null);
  const [votingTokenId, setVotingTokenId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newTokenId, setNewTokenId] = React.useState("");
  const [projectType, setProjectType] = React.useState<ProjectType>("nft");
  const [submitting, setSubmitting] = React.useState(false);

  const { isConnected, user } = useWalletStore();
  const { toast } = useToast();
  const { showLimitReachedModal, refreshVoteLimit } = useVoteLimitContext();

  const headerRef = useReveal();
  const contentRef = useReveal();

  const debouncedSearch = useDebounce(search, 300);

  React.useEffect(() => {
    fetchCollections();
    fetchTokens();
  }, []);

  React.useEffect(() => {
    if (debouncedSearch.length > 0) {
      fetchCollections(false, debouncedSearch);
      fetchTokens(debouncedSearch);
    } else if (debouncedSearch === "" && !loading) {
      fetchCollections(false, "");
      fetchTokens();
    }
  }, [debouncedSearch]);

  async function fetchCollections(sync = false, searchQuery?: string) {
    try {
      if (sync) {
        setSyncing(true);
      } else if (searchQuery !== undefined && searchQuery.length > 0) {
        setSearchLoading(true);
      } else if (!isSearching) {
        setLoading(true);
      }

      const isSearchMode = searchQuery !== undefined && searchQuery.length > 0;
      setIsSearching(isSearchMode);

      const params = new URLSearchParams({
        ...(sync && { sync: "true" }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/collections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTotalCollections(data.total);

        if (data.isSearch) {
          setSearchResults(data.collections);
          setTopCollections([]);
          setWorstCollections([]);
        } else {
          setTopCollections(data.top || []);
          setWorstCollections(data.worst || []);
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      toast({
        title: "Error",
        description: "Failed to fetch collections",
        variant: "error",
      });
    } finally {
      setLoading(false);
      setSyncing(false);
      setSearchLoading(false);
    }
  }

  async function fetchTokens(searchQuery?: string) {
    try {
      setLoadingTokens(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/tokens?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.isSearch) {
          setTokenSearchResults(data.tokens || []);
          setTopTokens([]);
          setWorstTokens([]);
        } else {
          setTopTokens(data.top || data.tokens || []);
          setWorstTokens(data.worst || []);
          setTokenSearchResults([]);
        }
        setTotalTokens(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  }

  async function handleVote(collectionId: string, voteType: "UP" | "DOWN") {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet to vote" });
      return;
    }

    setVotingId(collectionId);

    try {
      const response = await fetch(`/api/collections/${collectionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, useNftVotes: true }),
      });

      if (response.ok) {
        const data = await response.json();
        const updateCollection = (c: Collection) =>
          c.id === collectionId
            ? { ...c, totalVotes: data.totalVotes, userVote: { voteWeight: data.yourVoteWeight } }
            : c;

        setTopCollections((prev) => prev.map(updateCollection));
        setWorstCollections((prev) => prev.map(updateCollection));
        setSearchResults((prev) => prev.map(updateCollection));

        const nftBonus = data.nftBonus > 0 ? ` (+${data.nftBonus} NFT bonus)` : "";
        toast({ title: "Vote recorded!", description: `Your vote of ${Math.abs(data.yourVoteWeight)}${nftBonus} has been counted` });
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/collections"), undefined, { revalidate: true });
        refreshVoteLimit();
      } else if (response.status === 429) {
        showLimitReachedModal();
      } else {
        const error = await response.json();
        toast({ title: "Vote failed", description: error.error || "Something went wrong", variant: "error" });
      }
    } catch (error) {
      console.error("Vote error:", error);
      toast({ title: "Error", description: "Failed to submit vote", variant: "error" });
    } finally {
      setVotingId(null);
    }
  }

  async function handleTokenVote(tokenId: string, voteType: "UP" | "DOWN") {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet to vote" });
      return;
    }

    setVotingTokenId(tokenId);

    try {
      const response = await fetch(`/api/tokens/${tokenId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, useNftVotes: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setTopTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId
              ? { ...t, totalVotes: data.totalVotes, userVote: { voteWeight: data.yourVoteWeight } }
              : t
          )
        );
        const nftBonus = data.nftBonus > 0 ? ` (+${data.nftBonus} NFT bonus)` : "";
        toast({ title: "Vote recorded!", description: `Your vote of ${Math.abs(data.yourVoteWeight)}${nftBonus} has been counted` });
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/tokens"), undefined, { revalidate: true });
        refreshVoteLimit();
      } else if (response.status === 429) {
        showLimitReachedModal();
      } else {
        const error = await response.json();
        toast({ title: "Vote failed", description: error.error || "Something went wrong", variant: "error" });
      }
    } catch (error) {
      console.error("Token vote error:", error);
      toast({ title: "Error", description: "Failed to submit vote", variant: "error" });
    } finally {
      setVotingTokenId(null);
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.25)]">
            <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-zinc-300 to-zinc-400 flex items-center justify-center flex-shrink-0">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-text-secondary font-mono font-bold text-[10px] sm:text-xs">#{rank}</span>
          </div>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return "bg-bg-card border-amber-400/20 hover:border-amber-400/40";
      case 2: return "bg-bg-card border-zinc-400/20 hover:border-zinc-400/40";
      case 3: return "bg-bg-card border-orange-400/20 hover:border-orange-400/40";
      default: return "bg-bg-card border-border hover:border-brand/20";
    }
  };

  const clearSearch = () => {
    setSearch("");
    setIsSearching(false);
    setSearchResults([]);
    setTokenSearchResults([]);
  };

  async function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenId.trim()) return;

    setSubmitting(true);
    try {
      const endpoint = projectType === "nft" ? "/api/collections/submit" : "/api/tokens/submit";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: newTokenId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        const itemName = projectType === "nft"
          ? data.collection?.name
          : data.token?.symbol || data.token?.name;
        toast({
          title: data.autoApproved ? "Project Added!" : "Project Submitted!",
          description: data.autoApproved
            ? `${itemName} has been added to the list`
            : `${itemName} is pending admin approval`,
        });
        setNewTokenId("");
        setShowAddModal(false);
        if (data.autoApproved) {
          if (projectType === "nft") fetchCollections();
          else fetchTokens();
        }
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit project", variant: "error" });
      }
    } catch (error) {
      console.error("Failed to submit project:", error);
      toast({ title: "Error", description: "Failed to submit project", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 reveal-delay-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary mb-2">
                Community Ranked
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
                Tokens
              </h1>
              {/* Stat pills — consistent with /profile header */}
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[8px] bg-brand/8 border border-brand/20 text-[11px]">
                  <Layers className="h-3 w-3 text-brand" />
                  <span className="font-semibold text-text-primary tabular-nums">{totalCollections}</span>
                  <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">NFTs</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[8px] bg-accent-coral/8 border border-accent-coral/20 text-[11px]">
                  <Coins className="h-3 w-3 text-accent-coral" />
                  <span className="font-semibold text-text-primary tabular-nums">{totalTokens}</span>
                  <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">FTs</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.isAdmin && (
                <button
                  onClick={() => fetchCollections(true)}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 h-9 text-[13px] font-medium rounded-[10px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 active:scale-[0.97]"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  {syncing ? "Syncing…" : "Sync"}
                </button>
              )}
            </div>
          </div>

          {/* Search + Add */}
          <div className="flex gap-2 sm:gap-3 reveal-delay-2">
            <div className="relative flex-1">
              {searchLoading || loadingTokens ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              )}
              <input
                type="text"
                placeholder="Search NFTs or FTs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full h-10 pl-10 pr-10 rounded-[10px] bg-bg-card",
                  "border border-[var(--card-border)]",
                  "shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]",
                  "text-text-primary placeholder:text-text-tertiary text-sm",
                  "transition-[border-color,box-shadow] duration-150 ease-out",
                  "focus:outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_rgba(58,204,184,0.18),0_1px_0_rgba(255,255,255,0.02)_inset]"
                )}
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors active:scale-95"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isConnected && (
              <Button onClick={() => setShowAddModal(true)} className="gap-1.5 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Project</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
        {/* Add Project Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070A]/70 backdrop-blur-[6px] animate-fade-in" onClick={() => setShowAddModal(false)}>
            <div
              className="bg-bg-card border border-[var(--card-border)] rounded-[16px] p-6 w-full max-w-md mx-4 shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(58,204,184,0.06)] animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">Add Project</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close"
                  className="p-1.5 -mr-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="inline-flex h-10 p-1 rounded-[10px] border border-[var(--card-border)] bg-bg-secondary/40 w-full mb-5">
                <button
                  type="button"
                  onClick={() => setProjectType("nft")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-[7px] text-sm font-medium",
                    "transition-[background-color,color,box-shadow] duration-200 ease-out",
                    projectType === "nft"
                      ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Layers className="h-4 w-4" />
                  NFT
                </button>
                <button
                  type="button"
                  onClick={() => setProjectType("token")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-[7px] text-sm font-medium",
                    "transition-[background-color,color,box-shadow] duration-200 ease-out",
                    projectType === "token"
                      ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Coins className="h-4 w-4" />
                  FT
                </button>
              </div>

              <p className="text-sm text-text-secondary mb-4">
                {projectType === "nft"
                  ? "Enter the Hedera Token ID of the NFT collection you want to add. If you hold an El Santuario NFT, it will be auto-approved!"
                  : "Enter the Hedera Token ID of the token you want to add. If you hold an El Santuario NFT, it will be auto-approved!"}
              </p>
              <form onSubmit={handleSubmitProject} className="space-y-4">
                <Input
                  placeholder="0.0.XXXXX"
                  value={newTokenId}
                  onChange={(e) => setNewTokenId(e.target.value)}
                  disabled={submitting}
                />
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1" disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" loading={submitting}>
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div ref={contentRef} className="reveal">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : isSearching ? (
            /* Search Results */
            <div className="space-y-4 reveal-delay-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  <span className="font-mono">{searchResults.length + tokenSearchResults.length}</span> results for &ldquo;{search}&rdquo;
                </span>
                <Button variant="ghost" size="sm" onClick={clearSearch}>Clear search</Button>
              </div>

              {searchResults.length === 0 && tokenSearchResults.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
                  <Search className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
                  <p className="text-text-secondary text-sm mb-3">No projects found</p>
                  {isConnected && (
                    <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add this project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {searchResults.length > 0 && (
                    <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
                      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
                        <Layers className="h-4 w-4 text-text-secondary" />
                        <span className="font-semibold text-text-primary text-sm">NFTs (<span className="font-mono">{searchResults.length}</span>)</span>
                      </div>
                      <div className="p-3 max-h-[50vh] overflow-y-auto space-y-2">
                        {searchResults.map((collection) => (
                          <CollectionRow key={collection.id} collection={collection} votingId={votingId} onVote={handleVote} getRankIcon={getRankIcon} getRankStyle={getRankStyle} />
                        ))}
                      </div>
                    </div>
                  )}
                  {tokenSearchResults.length > 0 && (
                    <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
                      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
                        <Coins className="h-4 w-4 text-text-secondary" />
                        <span className="font-semibold text-text-primary text-sm">FTs (<span className="font-mono">{tokenSearchResults.length}</span>)</span>
                      </div>
                      <div className="p-3 max-h-[50vh] overflow-y-auto space-y-2">
                        {tokenSearchResults.map((token) => (
                          <TokenRow key={token.id} token={token} votingId={votingTokenId} onVote={handleTokenVote} getRankIcon={getRankIcon} getRankStyle={getRankStyle} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Main Grid: NFTs left + Tokens right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 reveal-delay-1">
                {/* Top 30 NFTs */}
                <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
                  <div className="px-5 h-14 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <span className="font-semibold text-text-primary text-[14px] tracking-tight">Top 30 NFTs</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">ranked</span>
                  </div>
                  <div className="p-3 max-h-[70vh] overflow-y-auto">
                    {topCollections.length === 0 ? (
                      <div className="text-center py-12">
                        <Layers className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
                        <p className="text-text-secondary text-sm mb-3">No collections yet</p>
                        {user?.isAdmin && (
                          <Button size="sm" onClick={() => fetchCollections(true)} className="gap-2">
                            <RefreshCw className="h-3 w-3" />Sync Now
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topCollections.map((collection) => (
                          <CollectionRow key={collection.id} collection={collection} votingId={votingId} onVote={handleVote} getRankIcon={getRankIcon} getRankStyle={getRankStyle} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top 30 FTs */}
                <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
                  <div className="px-5 h-14 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center">
                        <Coins className="h-3.5 w-3.5 text-accent-coral" />
                      </div>
                      <span className="font-semibold text-text-primary text-[14px] tracking-tight">Top 30 FTs</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">ranked</span>
                  </div>
                  <div className="p-3 max-h-[70vh] overflow-y-auto">
                    {loadingTokens ? (
                      <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-14 rounded-[10px] bg-bg-secondary/40 border border-[var(--border-subtle)] animate-pulse" />
                        ))}
                      </div>
                    ) : topTokens.length === 0 ? (
                      <div className="text-center py-12">
                        <Coins className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
                        <p className="text-text-secondary text-sm">No tokens yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topTokens.map((token) => (
                          <TokenRow key={token.id} token={token} votingId={votingTokenId} onVote={handleTokenVote} getRankIcon={getRankIcon} getRankStyle={getRankStyle} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Voting Info */}
          <div className="mt-6 text-xs text-text-tertiary text-center space-y-1 reveal-delay-3">
            <p className="font-mono">1 vote per wallet + 1 per dragon + 5 for El Santuario holders</p>
            <p>Your vote is permanent. You can change it anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collection Row Component
function CollectionRow({
  collection,
  votingId,
  onVote,
  getRankIcon,
  getRankStyle,
  compact = false,
}: {
  collection: Collection;
  votingId: string | null;
  onVote: (id: string, type: "UP" | "DOWN") => void;
  getRankIcon: (rank: number) => React.ReactNode;
  getRankStyle: (rank: number) => string;
  compact?: boolean;
}) {
  const isVoting = votingId === collection.id;
  const hasVoted = collection.userVote !== null;
  const voteIsUp = hasVoted && collection.userVote!.voteWeight > 0;

  if (compact) {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors w-36 lg:w-auto", getRankStyle(collection.rank))}>
        {getRankIcon(collection.rank)}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
          {collection.image ? (
            <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Layers className="h-4 w-4 text-text-tertiary" /></div>
          )}
        </div>
        <p className="text-xs font-medium text-center truncate w-full text-text-primary">{collection.name}</p>
        <div className="flex items-center gap-1 text-text-secondary text-xs font-mono font-bold">
          <Trophy className="h-3 w-3" />{collection.totalVotes}
        </div>
        <div className="flex gap-1">
          <Button variant={hasVoted && voteIsUp ? "default" : "ghost"} size="sm" onClick={() => onVote(collection.id, "UP")} disabled={isVoting} className={cn("h-6 w-6 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}>
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button variant={hasVoted && !voteIsUp ? "default" : "ghost"} size="sm" onClick={() => onVote(collection.id, "DOWN")} disabled={isVoting} className={cn("h-6 w-6 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}>
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 h-14 rounded-[10px] border transition-[border-color,background-color] duration-200",
      "hover:bg-bg-secondary/40",
      getRankStyle(collection.rank),
      hasVoted && voteIsUp && "!border-l-[3px] !border-l-success",
      hasVoted && !voteIsUp && "!border-l-[3px] !border-l-error"
    )}>
      {getRankIcon(collection.rank)}

      <div className="w-9 h-9 rounded-[8px] overflow-hidden bg-bg-secondary flex-shrink-0 ring-1 ring-[var(--card-border)]">
        {collection.image ? (
          <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Layers className="h-4 w-4 text-text-tertiary" /></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-text-primary text-[13px] truncate hover:text-brand inline-flex items-center gap-1 transition-colors tracking-tight"
        >
          <span className="truncate">{collection.name}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
        </a>
        <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary mt-0.5">
          <span className="hidden sm:inline tabular-nums">{collection.tokenAddress}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /><span className="tabular-nums">{collection.owners.toLocaleString()}</span></span>
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /><span className="tabular-nums">{collection.supply.toLocaleString()}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 px-2 h-7 rounded-[7px] bg-bg-secondary border border-[var(--border-subtle)]">
          <Trophy className="h-3 w-3 text-text-tertiary" />
          <span className="font-semibold text-text-primary text-[12px] tabular-nums">{collection.totalVotes}</span>
        </div>
        <Button variant={hasVoted && voteIsUp ? "success" : "ghost"} size="sm" onClick={() => onVote(collection.id, "UP")} disabled={isVoting || (hasVoted && voteIsUp)} className={cn("h-7 w-7 p-0", hasVoted && voteIsUp && "cursor-default")}>
          {isVoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className={cn("h-3 w-3", hasVoted && voteIsUp && "fill-current")} />}
        </Button>
        <Button variant={hasVoted && !voteIsUp ? "destructive" : "ghost"} size="sm" onClick={() => onVote(collection.id, "DOWN")} disabled={isVoting || (hasVoted && !voteIsUp)} className={cn("h-7 w-7 p-0", hasVoted && !voteIsUp && "cursor-default")}>
          <ThumbsDown className={cn("h-3 w-3", hasVoted && !voteIsUp && "fill-current")} />
        </Button>
        <ShareToXButton
          shareText={`I just voted for ${collection.name} on @hashly_h\n\nJoin and vote for your favorite collections!`}
          shareUrl="https://hash-ly.com/projects"
          className="h-7 w-7 p-0 flex items-center justify-center"
        />
      </div>
    </div>
  );
}

// Token Row Component
function TokenRow({
  token,
  votingId,
  onVote,
  getRankIcon,
  getRankStyle,
}: {
  token: Token;
  votingId: string | null;
  onVote: (id: string, type: "UP" | "DOWN") => void;
  getRankIcon: (rank: number) => React.ReactNode;
  getRankStyle: (rank: number) => string;
}) {
  const isVoting = votingId === token.id;
  const hasVoted = token.userVote !== null;
  const voteIsUp = hasVoted && token.userVote!.voteWeight > 0;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 h-14 rounded-[10px] border transition-[border-color,background-color] duration-200",
      "hover:bg-bg-secondary/40",
      getRankStyle(token.rank),
      hasVoted && voteIsUp && "!border-l-[3px] !border-l-success",
      hasVoted && !voteIsUp && "!border-l-[3px] !border-l-error"
    )}>
      {getRankIcon(token.rank)}

      <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0 ring-1 ring-[var(--card-border)]">
        {token.icon ? (
          <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Coins className="h-4 w-4 text-text-tertiary" /></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-text-primary text-[13px] flex items-center gap-1.5 tracking-tight">
          <span className="font-semibold">{token.symbol}</span>
          <span className="text-text-tertiary text-[11px] hidden sm:inline truncate">{token.name}</span>
          {token.marketCap && token.marketCap > 0 && (
            <span className="text-[10px] text-text-secondary tabular-nums ml-1 px-1.5 h-[18px] inline-flex items-center rounded-[4px] bg-bg-secondary border border-[var(--border-subtle)]">
              ${token.marketCap >= 1_000_000
                ? `${(token.marketCap / 1_000_000).toFixed(1)}M`
                : token.marketCap >= 1_000
                  ? `${(token.marketCap / 1_000).toFixed(0)}K`
                  : token.marketCap.toFixed(0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary mt-0.5">
          <span className="tabular-nums truncate">{token.tokenAddress}</span>
          <a
            href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-[4px] bg-brand/8 border border-brand/20 text-brand hover:bg-brand/12 transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
            <span className="hidden sm:inline font-medium">Swap</span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 px-2 h-7 rounded-[7px] bg-bg-secondary border border-[var(--border-subtle)]">
          <Trophy className="h-3 w-3 text-text-tertiary" />
          <span className="font-semibold text-text-primary text-[12px] tabular-nums">{token.totalVotes}</span>
        </div>
        <Button variant={hasVoted && voteIsUp ? "success" : "ghost"} size="sm" onClick={() => onVote(token.id, "UP")} disabled={isVoting || (hasVoted && voteIsUp)} className={cn("h-7 w-7 p-0", hasVoted && voteIsUp && "cursor-default")}>
          {isVoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className={cn("h-3 w-3", hasVoted && voteIsUp && "fill-current")} />}
        </Button>
        <Button variant={hasVoted && !voteIsUp ? "destructive" : "ghost"} size="sm" onClick={() => onVote(token.id, "DOWN")} disabled={isVoting || (hasVoted && !voteIsUp)} className={cn("h-7 w-7 p-0", hasVoted && !voteIsUp && "cursor-default")}>
          <ThumbsDown className={cn("h-3 w-3", hasVoted && !voteIsUp && "fill-current")} />
        </Button>
        <ShareToXButton
          shareText={`I just voted for $${token.symbol} on @hashly_h\n\nJoin and vote for your favorite tokens!`}
          shareUrl="https://hash-ly.com/projects"
          className="h-7 w-7 p-0 flex items-center justify-center"
        />
      </div>
    </div>
  );
}

// Token Row Compact Component (for worst tokens)
function TokenRowCompact({
  token,
  votingId,
  onVote,
}: {
  token: Token;
  votingId: string | null;
  onVote: (id: string, type: "UP" | "DOWN") => void;
}) {
  const isVoting = votingId === token.id;
  const hasVoted = token.userVote !== null;
  const voteIsUp = hasVoted && token.userVote!.voteWeight > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors w-36 lg:w-auto bg-bg-card border-border hover:border-brand/20">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
        <span className="text-text-secondary font-mono font-bold text-[10px] sm:text-xs">#{token.rank}</span>
      </div>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
        {token.icon ? (
          <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Coins className="h-4 w-4 text-text-tertiary" /></div>
        )}
      </div>
      <p className="text-xs font-bold text-center truncate w-full text-text-primary">${token.symbol}</p>
      {token.marketCap && token.marketCap > 0 && (
        <p className="text-[10px] text-text-secondary font-mono">
          MC: ${token.marketCap >= 1000000
            ? `${(token.marketCap / 1000000).toFixed(1)}M`
            : token.marketCap >= 1000
              ? `${(token.marketCap / 1000).toFixed(0)}K`
              : token.marketCap.toFixed(0)}
        </p>
      )}
      <div className="flex items-center gap-1 text-text-secondary text-xs font-mono font-bold">
        <Trophy className="h-3 w-3" />{token.totalVotes}
      </div>
      <a
        href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors text-[10px]"
      >
        <ArrowLeftRight className="h-2.5 w-2.5" />Swap
      </a>
      <div className="flex gap-1">
        <Button variant={hasVoted && voteIsUp ? "default" : "ghost"} size="sm" onClick={() => onVote(token.id, "UP")} disabled={isVoting} className={cn("h-6 w-6 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}>
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button variant={hasVoted && !voteIsUp ? "default" : "ghost"} size="sm" onClick={() => onVote(token.id, "DOWN")} disabled={isVoting} className={cn("h-6 w-6 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}>
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
