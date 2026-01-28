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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toaster";

interface Collection {
  id: string;
  tokenAddress: string;
  name: string;
  owners: number;
  supply: number;
  totalVotes: number;
  rank: number;
  userVote: { voteWeight: number } | null;
}

export default function CollectionsPage() {
  const [topCollections, setTopCollections] = React.useState<Collection[]>([]);
  const [worstCollections, setWorstCollections] = React.useState<Collection[]>([]);
  const [searchResults, setSearchResults] = React.useState<Collection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [votingId, setVotingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [total, setTotal] = React.useState(0);
  const [isSearching, setIsSearching] = React.useState(false);

  const { isConnected, user } = useWalletStore();
  const { toast } = useToast();

  React.useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections(sync = false, searchQuery?: string) {
    try {
      if (sync) setSyncing(true);
      else setLoading(true);

      const isSearchMode = searchQuery !== undefined && searchQuery.length > 0;
      setIsSearching(isSearchMode);

      const params = new URLSearchParams({
        ...(sync && { sync: "true" }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/collections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTotal(data.total);

        if (data.isSearch) {
          // Search results
          setSearchResults(data.collections);
          setTopCollections([]);
          setWorstCollections([]);
        } else {
          // Normal view: top 30 + worst 10
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

        // Update the collection in whichever list it's in
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="h-4 w-4 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="h-4 w-4 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Medal className="h-4 w-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-bg-secondary border border-border flex items-center justify-center">
            <span className="text-text-secondary font-bold text-xs">#{rank}</span>
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCollections(false, search);
  };

  const clearSearch = () => {
    setSearch("");
    setIsSearching(false);
    fetchCollections(false, "");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-accent-secondary/5 to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="gradient-text">Discover NFTs on Hedera</span>
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto mb-4">
            Explore new and existing collections, vote on your favorites, and see what the community ranks at the top
          </p>

          {user?.isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchCollections(true)}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync"}
            </Button>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search all collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-text-primary placeholder:text-text-secondary text-sm"
            />
          </div>
        </form>

        {/* Total Collections Banner */}
        <div className="mb-6 p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
          <p className="text-center text-sm">
            <span className="font-bold text-accent-primary">{total}</span>
            <span className="text-text-secondary"> collections tracked with 20k+ HBAR volume</span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
          </div>
        ) : isSearching ? (
          /* Search Results */
          <div className="rounded-2xl border border-border bg-bg-card/50 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {searchResults.length} results for "{search}"
              </span>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            </div>
            <div className="p-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-8 w-8 mx-auto text-text-secondary mb-3" />
                  <p className="text-text-secondary text-sm">No collections found</p>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top 30 Best Voted */}
            <div className="rounded-2xl border border-border bg-bg-card/50 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-text-primary">Top 30 Best Voted</span>
              </div>
              <div className="p-3">
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

            {/* Top 10 Worst Voted */}
            {worstCollections.length > 0 && (
              <div className="rounded-2xl border border-red-500/30 bg-bg-card/50 overflow-hidden">
                <div className="p-4 border-b border-red-500/30 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-text-primary">Top 10 Worst Voted</span>
                </div>
                <div className="p-3">
                  <div className="space-y-2">
                    {worstCollections.map((collection) => (
                      <CollectionRow
                        key={collection.id}
                        collection={collection}
                        votingId={votingId}
                        onVote={handleVote}
                        getRankIcon={() => (
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <span className="text-red-400 font-bold text-xs">#{collection.rank}</span>
                          </div>
                        )}
                        getRankStyle={() => "bg-red-500/5 border-red-500/20 hover:border-red-500/40"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voting Info */}
        <p className="mt-4 text-xs text-text-secondary text-center">
          1 vote per wallet + 1 per dragon + 20 for El Santuario holders
        </p>
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
}: {
  collection: Collection;
  votingId: string | null;
  onVote: (id: string, type: "UP" | "DOWN") => void;
  getRankIcon: (rank: number) => React.ReactNode;
  getRankStyle: (rank: number) => string;
}) {
  const isVoting = votingId === collection.id;
  const hasVoted = collection.userVote !== null;
  const voteIsUp = hasVoted && collection.userVote!.voteWeight > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        getRankStyle(collection.rank)
      )}
    >
      {/* Rank */}
      {getRankIcon(collection.rank)}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <a
          href={`https://sentx.io/nft-marketplace/${collection.tokenAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-text-primary text-sm truncate hover:text-accent-primary flex items-center gap-1"
        >
          {collection.name}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="font-mono">{collection.tokenAddress}</span>
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

      {/* Votes */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-primary/10">
          <Trophy className="h-3 w-3 text-accent-primary" />
          <span className="font-bold text-accent-primary text-sm">
            {collection.totalVotes}
          </span>
        </div>

        <Button
          variant={hasVoted && voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(collection.id, "UP")}
          disabled={isVoting}
          className={cn(
            "h-8 w-8 p-0",
            hasVoted && voteIsUp && "bg-green-500 hover:bg-green-600"
          )}
        >
          {isVoting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ThumbsUp className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant={hasVoted && !voteIsUp ? "default" : "ghost"}
          size="sm"
          onClick={() => onVote(collection.id, "DOWN")}
          disabled={isVoting}
          className={cn(
            "h-8 w-8 p-0",
            hasVoted && !voteIsUp && "bg-red-500 hover:bg-red-600"
          )}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
