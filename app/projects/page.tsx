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

// Custom hook for debounce
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
  // NFT Collections state
  const [topCollections, setTopCollections] = React.useState<Collection[]>([]);
  const [worstCollections, setWorstCollections] = React.useState<Collection[]>([]);
  const [searchResults, setSearchResults] = React.useState<Collection[]>([]);
  const [totalCollections, setTotalCollections] = React.useState(0);

  // Tokens state
  const [topTokens, setTopTokens] = React.useState<Token[]>([]);
  const [worstTokens, setWorstTokens] = React.useState<Token[]>([]);
  const [tokenSearchResults, setTokenSearchResults] = React.useState<Token[]>([]);
  const [totalTokens, setTotalTokens] = React.useState(0);

  // UI state
  const [loading, setLoading] = React.useState(true);
  const [loadingTokens, setLoadingTokens] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [votingId, setVotingId] = React.useState<string | null>(null);
  const [votingTokenId, setVotingTokenId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);

  // Modal for adding project
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newTokenId, setNewTokenId] = React.useState("");
  const [projectType, setProjectType] = React.useState<ProjectType>("nft");
  const [submitting, setSubmitting] = React.useState(false);

  const { isConnected, user } = useWalletStore();
  const { toast } = useToast();
  const { showLimitReachedModal, refreshVoteLimit } = useVoteLimitContext();

  // Debounce search query (300ms)
  const debouncedSearch = useDebounce(search, 300);

  // Initial load
  React.useEffect(() => {
    fetchCollections();
    fetchTokens();
  }, []);

  // Real-time search with debounce - search both collections and tokens
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
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to vote",
      });
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
        toast({
          title: "Vote recorded!",
          description: `Your vote of ${Math.abs(data.yourVoteWeight)}${nftBonus} has been counted`,
        });
        // Refresh vote limit in navbar
        refreshVoteLimit();
      } else if (response.status === 429) {
        // Daily vote limit reached - show modal
        showLimitReachedModal();
      } else {
        const error = await response.json();
        toast({
          title: "Vote failed",
          description: error.error || "Something went wrong",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Vote error:", error);
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "error",
      });
    } finally {
      setVotingId(null);
    }
  }

  async function handleTokenVote(tokenId: string, voteType: "UP" | "DOWN") {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to vote",
      });
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
        toast({
          title: "Vote recorded!",
          description: `Your vote of ${Math.abs(data.yourVoteWeight)}${nftBonus} has been counted`,
        });
        // Refresh vote limit in navbar
        refreshVoteLimit();
      } else if (response.status === 429) {
        // Daily vote limit reached - show modal
        showLimitReachedModal();
      } else {
        const error = await response.json();
        toast({
          title: "Vote failed",
          description: error.error || "Something went wrong",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Token vote error:", error);
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "error",
      });
    } finally {
      setVotingTokenId(null);
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 flex-shrink-0">
            <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30 flex-shrink-0">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-text-secondary font-bold text-[10px] sm:text-xs">#{rank}</span>
          </div>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 via-gray-300/5 to-transparent border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-500/30";
      default:
        return "bg-bg-card/50 border-border/50 hover:border-accent-primary/30 hover:bg-accent-primary/5";
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
      const endpoint = projectType === "nft"
        ? "/api/collections/submit"
        : "/api/tokens/submit";

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
          if (projectType === "nft") {
            fetchCollections();
          } else {
            fetchTokens();
          }
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit project",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Failed to submit project:", error);
      toast({
        title: "Error",
        description: "Failed to submit project",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Compact Header - News style */}
      <div className="relative pt-4 pb-4 sm:pt-6 sm:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-bg-card dark:bg-[#1a1a2e] border-2 border-accent-primary/50 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                  <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-accent-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Hedera Projects</h1>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {totalCollections} NFTs · {totalTokens} Tokens
                </p>
              </div>
            </div>

            {user?.isAdmin && (
              <button
                onClick={() => fetchCollections(true)}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bg-card dark:bg-bg-secondary border border-border hover:border-accent-primary/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Search and Add Project */}
        <div className="flex gap-2 sm:gap-3 mb-6">
          <div className="relative flex-1">
            {searchLoading || loadingTokens ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-primary animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            )}
            <input
              type="text"
              placeholder="Search NFTs or tokens by name or token ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-md bg-bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-text-primary placeholder:text-text-secondary text-sm"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isConnected && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="gap-2 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Project</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>


        {/* Add Project Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Add Project</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Project Type Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setProjectType("nft")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border transition-all",
                    projectType === "nft"
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border hover:border-accent-primary/50 text-text-secondary"
                  )}
                >
                  <Layers className="h-4 w-4" />
                  <span className="font-medium">NFT Collection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectType("token")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border transition-all",
                    projectType === "token"
                      ? "border-accent-secondary bg-accent-secondary/10 text-accent-secondary"
                      : "border-border hover:border-accent-secondary/50 text-text-secondary"
                  )}
                >
                  <Coins className="h-4 w-4" />
                  <span className="font-medium">Token</span>
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={submitting}
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
          </div>
        ) : isSearching ? (
          /* Search Results - Both NFTs and Tokens */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {searchResults.length + tokenSearchResults.length} results for "{search}"
              </span>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            </div>

            {searchResults.length === 0 && tokenSearchResults.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg-card/50 p-8 text-center">
                <Search className="h-8 w-8 mx-auto text-text-secondary mb-3" />
                <p className="text-text-secondary text-sm mb-3">No projects found</p>
                {isConnected && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add this project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* NFT Search Results */}
                {searchResults.length > 0 && (
                  <div className="rounded-lg border border-border bg-bg-card/50 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2">
                      <Layers className="h-5 w-5 text-accent-primary" />
                      <span className="font-semibold text-text-primary">NFT Collections ({searchResults.length})</span>
                    </div>
                    <div className="p-3 max-h-[50vh] overflow-y-auto">
                      <div className="space-y-2">
                        {searchResults.map((collection) => (
                          <CollectionRow
                            key={collection.id}
                            collection={collection}
                            votingId={votingId}
                            onVote={handleVote}
                            getRankIcon={getRankIcon}
                            getRankStyle={getRankStyle}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Token Search Results */}
                {tokenSearchResults.length > 0 && (
                  <div className="rounded-lg border border-accent-secondary/30 bg-bg-card/50 overflow-hidden">
                    <div className="p-4 border-b border-accent-secondary/30 flex items-center gap-2">
                      <Coins className="h-5 w-5 text-accent-secondary" />
                      <span className="font-semibold text-text-primary">Tokens ({tokenSearchResults.length})</span>
                    </div>
                    <div className="p-3 max-h-[50vh] overflow-y-auto">
                      <div className="space-y-2">
                        {tokenSearchResults.map((token) => (
                          <TokenRow
                            key={token.id}
                            token={token}
                            votingId={votingTokenId}
                            onVote={handleTokenVote}
                            getRankIcon={getRankIcon}
                            getRankStyle={getRankStyle}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Main Grid: Top NFTs (left) + Top Tokens (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Top 30 NFTs - Left Column */}
              <div className="rounded-lg border border-border bg-bg-card/50 overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-text-primary">Top 30 NFTs</span>
                </div>
                <div className="p-3 max-h-[70vh] overflow-y-auto">
                  {topCollections.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className="h-8 w-8 mx-auto text-text-secondary mb-3" />
                      <p className="text-text-secondary text-sm mb-3">No collections yet</p>
                      {user?.isAdmin && (
                        <Button size="sm" onClick={() => fetchCollections(true)} className="gap-2">
                          <RefreshCw className="h-3 w-3" />
                          Sync Now
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topCollections.map((collection) => (
                        <CollectionRow
                          key={collection.id}
                          collection={collection}
                          votingId={votingId}
                          onVote={handleVote}
                          getRankIcon={getRankIcon}
                          getRankStyle={getRankStyle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top 30 Tokens - Right Column */}
              <div className="rounded-lg border border-accent-secondary/30 bg-bg-card/50 overflow-hidden">
                <div className="p-4 border-b border-accent-secondary/30 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-accent-secondary" />
                  <span className="font-semibold text-text-primary">Top 30 Tokens</span>
                </div>
                <div className="p-3 max-h-[70vh] overflow-y-auto">
                  {loadingTokens ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent-secondary" />
                    </div>
                  ) : topTokens.length === 0 ? (
                    <div className="text-center py-12">
                      <Coins className="h-8 w-8 mx-auto text-text-secondary mb-3" />
                      <p className="text-text-secondary text-sm">No tokens yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topTokens.map((token) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          votingId={votingTokenId}
                          onVote={handleTokenVote}
                          getRankIcon={getRankIcon}
                          getRankStyle={getRankStyle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Worst Voted Section - Two columns: NFTs left, Tokens right */}
            {(worstCollections.length > 0 || worstTokens.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Worst NFTs - Left */}
                <div className="rounded-lg border border-red-500/30 bg-bg-card/50 overflow-hidden">
                  <div className="p-4 border-b border-red-500/30 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-text-primary">Worst Voted NFTs</span>
                  </div>
                  <div className="p-3 overflow-x-auto lg:overflow-visible">
                    {worstCollections.length === 0 ? (
                      <div className="text-center py-8">
                        <Layers className="h-6 w-6 mx-auto text-text-secondary mb-2" />
                        <p className="text-text-secondary text-sm">No worst NFTs yet</p>
                      </div>
                    ) : (
                      <div className="flex gap-2 min-w-max lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:min-w-0">
                        {worstCollections.slice(0, 6).map((collection) => (
                          <CollectionRow
                            key={collection.id}
                            collection={collection}
                            votingId={votingId}
                            onVote={handleVote}
                            getRankIcon={() => (
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-red-400 font-bold text-[10px] sm:text-xs">#{collection.rank}</span>
                              </div>
                            )}
                            getRankStyle={() => "bg-red-500/5 border-red-500/20 hover:border-red-500/40"}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Worst Tokens - Right */}
                <div className="rounded-lg border border-orange-500/30 bg-bg-card/50 overflow-hidden">
                  <div className="p-4 border-b border-orange-500/30 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold text-text-primary">Worst Voted Tokens</span>
                  </div>
                  <div className="p-3 overflow-x-auto lg:overflow-visible">
                    {worstTokens.length === 0 ? (
                      <div className="text-center py-8">
                        <Coins className="h-6 w-6 mx-auto text-text-secondary mb-2" />
                        <p className="text-text-secondary text-sm">No worst tokens yet</p>
                      </div>
                    ) : (
                      <div className="flex gap-2 min-w-max lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:min-w-0">
                        {worstTokens.slice(0, 6).map((token) => (
                          <TokenRowCompact
                            key={token.id}
                            token={token}
                            votingId={votingTokenId}
                            onVote={handleTokenVote}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Voting Info */}
        <div className="mt-4 text-xs text-text-secondary text-center space-y-1">
          <p>1 vote per wallet + 1 per dragon + 5 for El Santuario holders</p>
          <p>Your vote is permanent. You can change it anytime.</p>
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
      <div
        className={cn(
          "flex flex-col items-center gap-1.5 p-2.5 rounded-md border transition-all duration-200 w-36 lg:w-auto",
          getRankStyle(collection.rank)
        )}
      >
        {getRankIcon(collection.rank)}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
          {collection.image ? (
            <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="h-4 w-4 text-text-secondary" />
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-center truncate w-full">{collection.name}</p>
        <div className="flex items-center gap-1 text-red-400 text-xs font-bold">
          <Trophy className="h-3 w-3" />
          {collection.totalVotes}
        </div>
        <div className="flex gap-1">
          <Button
            variant={hasVoted && voteIsUp ? "default" : "ghost"}
            size="sm"
            onClick={() => onVote(collection.id, "UP")}
            disabled={isVoting}
            className={cn("h-6 w-6 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant={hasVoted && !voteIsUp ? "default" : "ghost"}
            size="sm"
            onClick={() => onVote(collection.id, "DOWN")}
            disabled={isVoting}
            className={cn("h-6 w-6 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-md border transition-all duration-200",
        getRankStyle(collection.rank)
      )}
    >
      {getRankIcon(collection.rank)}

      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
        {collection.image ? (
          <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-4 w-4 text-text-secondary" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-text-primary text-sm truncate hover:text-accent-primary flex items-center gap-1"
        >
          <span className="truncate">{collection.name}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-secondary">
          <span className="font-mono hidden sm:inline">{collection.tokenAddress}</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {collection.owners.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {collection.supply.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-accent-primary/10">
          <Trophy className="h-3 w-3 text-accent-primary" />
          <span className="font-bold text-accent-primary text-xs sm:text-sm">{collection.totalVotes}</span>
        </div>

        <Button
          variant={hasVoted && voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(collection.id, "UP")}
          disabled={isVoting}
          className={cn("h-7 w-7 sm:h-8 sm:w-8 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}
        >
          {isVoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
        </Button>
        <Button
          variant={hasVoted && !voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(collection.id, "DOWN")}
          disabled={isVoting}
          className={cn("h-7 w-7 sm:h-8 sm:w-8 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
        <ShareToXButton
          shareText={`I just voted for ${collection.name} on @hashly_h 🔥\n\nJoin and vote for your favorite collections!`}
          shareUrl="https://hash-ly.com/projects"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex items-center justify-center"
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
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-md border transition-all duration-200",
        getRankStyle(token.rank)
      )}
    >
      {getRankIcon(token.rank)}

      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
        {token.icon ? (
          <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Coins className="h-4 w-4 text-text-secondary" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary text-sm flex items-center gap-1.5">
          <span className="font-bold">{token.symbol}</span>
          <span className="text-text-secondary text-xs hidden sm:inline">({token.name})</span>
          {token.marketCap && token.marketCap > 0 && (
            <span className="text-xs text-accent-secondary font-mono ml-1">
              MC: ${token.marketCap >= 1000000
                ? `${(token.marketCap / 1000000).toFixed(1)}M`
                : token.marketCap >= 1000
                  ? `${(token.marketCap / 1000).toFixed(0)}K`
                  : token.marketCap.toFixed(0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-mono">{token.tokenAddress}</span>
          <a
            href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span className="hidden sm:inline">Swap</span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-accent-secondary/10">
          <Trophy className="h-3 w-3 text-accent-secondary" />
          <span className="font-bold text-accent-secondary text-xs sm:text-sm">{token.totalVotes}</span>
        </div>

        <Button
          variant={hasVoted && voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(token.id, "UP")}
          disabled={isVoting}
          className={cn("h-7 w-7 sm:h-8 sm:w-8 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}
        >
          {isVoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
        </Button>
        <Button
          variant={hasVoted && !voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(token.id, "DOWN")}
          disabled={isVoting}
          className={cn("h-7 w-7 sm:h-8 sm:w-8 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
        <ShareToXButton
          shareText={`I just voted for $${token.symbol} on @hashly_h 🔥\n\nJoin and vote for your favorite tokens!`}
          shareUrl="https://hash-ly.com/projects"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex items-center justify-center"
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
    <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-md border transition-all duration-200 w-36 lg:w-auto bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-orange-400 font-bold text-[10px] sm:text-xs">#{token.rank}</span>
      </div>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
        {token.icon ? (
          <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Coins className="h-4 w-4 text-text-secondary" />
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-center truncate w-full">${token.symbol}</p>
      {token.marketCap && token.marketCap > 0 && (
        <p className="text-[10px] text-accent-secondary font-mono">
          MC: ${token.marketCap >= 1000000
            ? `${(token.marketCap / 1000000).toFixed(1)}M`
            : token.marketCap >= 1000
              ? `${(token.marketCap / 1000).toFixed(0)}K`
              : token.marketCap.toFixed(0)}
        </p>
      )}
      <div className="flex items-center gap-1 text-orange-400 text-xs font-bold">
        <Trophy className="h-3 w-3" />
        {token.totalVotes}
      </div>
      <a
        href={`https://www.saucerswap.finance/swap/HBAR/${token.tokenAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-[10px]"
      >
        <ArrowLeftRight className="h-2.5 w-2.5" />
        Swap
      </a>
      <div className="flex gap-1">
        <Button
          variant={hasVoted && voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(token.id, "UP")}
          disabled={isVoting}
          className={cn("h-6 w-6 p-0", hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600")}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          variant={hasVoted && !voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(token.id, "DOWN")}
          disabled={isVoting}
          className={cn("h-6 w-6 p-0", hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600")}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
