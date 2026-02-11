"use client";

import * as React from "react";
import {
  Newspaper,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  Calendar,
  Search,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string | null;
  pubDate: string;
  creator: string;
  isGenfinity: boolean;
}

export default function NewsPage() {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 25;

  const fetchNews = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/news");
      if (response.ok) {
        const data = await response.json();
        setNews(data.news);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh every hour
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchNews(true);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNews]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Filter and sort news
  const filteredNews = React.useMemo(() => {
    let result = [...news];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.creator?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [news, search, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
  const paginatedNews = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNews, currentPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

  return (
    <div className="min-h-screen">
      {/* Compact Header */}
      <div className="relative pt-4 pb-4 sm:pt-6 sm:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-bg-card dark:bg-[#1a1a2e] border-2 border-purple-500/50 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
                  <Newspaper className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Hedera News
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {filteredNews.length} articles {search && `for "${search}"`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNews(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bg-card dark:bg-bg-secondary border border-border hover:border-purple-500/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                {refreshing ? "..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Search and filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search news..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm rounded-lg bg-bg-card dark:bg-bg-secondary border border-border focus:outline-none focus:border-purple-500/50 text-text-primary placeholder:text-text-secondary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary hidden sm:block">Sort:</span>
              <button
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-bg-card dark:bg-bg-secondary border border-border hover:border-purple-500/50 transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortBy === "newest" ? "Newest" : "Oldest"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 mx-auto text-text-secondary mb-4" />
            <p className="text-text-secondary">No news available at the moment</p>
            <button
              onClick={() => fetchNews()}
              className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bg-secondary border border-border hover:border-accent-primary/50 transition-colors mx-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {paginatedNews.map((item) => (
                <NewsCard key={item.id} item={item} formatDate={formatDate} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-bg-card border border-border hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and nearby pages
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    if (!showPage) {
                      // Show dots for gaps
                      if (page === 2 || page === totalPages - 1) {
                        return (
                          <span key={page} className="px-2 text-text-secondary">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-9 h-9 text-sm rounded-md border transition-colors font-mono",
                          currentPage === page
                            ? "bg-purple-500 border-purple-500 text-white"
                            : "bg-bg-card border-border hover:border-purple-500/50"
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-bg-card border border-border hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="mt-4 text-center text-xs text-text-secondary">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredNews.length)} of{" "}
                {filteredNews.length} articles
              </p>
            )}
          </>
        )}

        {/* Footer credit - minimal */}
        <div className="mt-10 sm:mt-12 flex justify-center">
          <a
            href="https://genfinity.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-text-secondary/60 hover:text-text-secondary transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60 group-hover:bg-purple-500 transition-colors" />
            <span>via <span className="font-medium">genfinity.io</span></span>
          </a>
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  item,
  formatDate,
}: {
  item: NewsItem;
  formatDate: (date: string) => string;
}) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex flex-col bg-bg-card/80 overflow-hidden transition-all duration-200",
        "border-l-4 rounded-r-lg",
        item.isGenfinity
          ? "border-l-purple-500 hover:border-l-purple-400"
          : "border-l-accent-primary/50 hover:border-l-accent-primary"
      )}
    >
      {/* Image - 2:1 ratio to match Genfinity images */}
      <div className="relative aspect-[2/1] bg-bg-secondary overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center",
            item.isGenfinity
              ? "bg-gradient-to-br from-purple-900/80 via-purple-800/60 to-purple-900/80"
              : "bg-gradient-to-br from-accent-primary/20 via-bg-secondary to-accent-primary/10"
          )}>
            <div className="flex flex-col items-center gap-2 opacity-60 group-hover:opacity-80 transition-opacity">
              <Newspaper className="h-10 w-10 sm:h-12 sm:w-12 text-white/40" />
              <span className="text-[10px] sm:text-xs text-white/40 font-medium tracking-wider uppercase">
                {item.isGenfinity ? "Genfinity" : "Hedera News"}
              </span>
            </div>
          </div>
        )}

        {/* Date badge - same style as other cards */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded text-white text-xs">
            <Calendar className="h-3 w-3" />
            <span className="font-mono">{formatDate(item.pubDate)}</span>
          </div>
        </div>

        {/* Genfinity Badge - skewed tag style */}
        {item.isGenfinity && (
          <div className="absolute top-2 right-2">
            <span className="skew-tag inline-block px-2 py-0.5 bg-purple-600 text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
              <span>GENFINITY</span>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col border-t border-border/30">
        {/* Creator with dot */}
        {item.creator && (
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary/70 mb-1.5">
            <span className="w-1 h-1 rounded-full bg-accent-primary" />
            <span className="truncate">{item.creator}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-text-primary mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-accent-primary transition-colors text-sm sm:text-base leading-tight">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-text-secondary/80 line-clamp-2 flex-1">
          {item.description}
        </p>

        {/* Read More - underline style */}
        <div className="mt-3 pt-2 border-t border-dashed border-border/50">
          <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors flex items-center gap-1">
            read more <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </div>
      </div>
    </a>
  );
}
