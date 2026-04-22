"use client";

import * as React from "react";
import {
  Newspaper,
  Loader2,
  RefreshCw,
  Calendar,
  Search,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWalletStore } from "@/store";
import { useReveal } from "@/hooks/useReveal";

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

interface NewsStats {
  [articleId: string]: { views: number; clicks: number };
}

export default function NewsPage() {
  const { user, isConnected } = useWalletStore();
  const isAdmin = isConnected && user?.isAdmin;

  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 25;

  // Admin stats
  const [stats, setStats] = React.useState<NewsStats>({});
  const [totals, setTotals] = React.useState({ views: 0, clicks: 0 });

  const headerRef = useReveal();
  const contentRef = useReveal();

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

  const fetchStats = React.useCallback(async () => {
    try {
      const response = await fetch("/api/news/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setTotals(data.totals);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Fetch stats if admin
  React.useEffect(() => {
    if (isAdmin) {
      fetchStats();
      const interval = setInterval(fetchStats, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchStats]);

  // Auto-refresh news every 24h
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchNews(true);
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNews]);

  // Track views for visible articles
  const trackedRef = React.useRef<Set<string>>(new Set());

  const trackView = React.useCallback((articleId: string) => {
    if (trackedRef.current.has(articleId)) return;
    trackedRef.current.add(articleId);
    fetch("/api/news/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, type: "view" }),
    }).catch(() => {});
  }, []);

  const trackClick = React.useCallback((articleId: string) => {
    fetch("/api/news/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, type: "click" }),
    }).catch(() => {});
  }, []);

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

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.creator?.toLowerCase().includes(searchLower)
      );
    }

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

  // Split first article for hero treatment
  const heroArticle = paginatedNews[0];
  const restArticles = paginatedNews.slice(1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="reveal pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="reveal-delay-1">
              <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary mb-2">
                Hedera Ecosystem
              </p>
              <h1 className="text-[28px] sm:text-[34px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.1]">
                News
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {filteredNews.length} articles {search && `for "${search}"`}
              </p>
            </div>

            <div className="flex items-center gap-2 reveal-delay-2">
              {/* Admin totals */}
              {isAdmin && (
                <div className="flex items-center gap-3 mr-2 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-blue-400" />
                    <span className="font-medium font-mono text-blue-400">{totals.views.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-medium font-mono text-green-400">{totals.clicks.toLocaleString()}</span>
                  </span>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={() => fetchNews(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bg-card border border-border hover:border-brand/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                  {refreshing ? "..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 reveal-delay-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search news..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg bg-bg-card border border-border focus:outline-none focus:border-brand/50 text-text-primary placeholder:text-text-tertiary transition-colors"
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

            <button
              onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-bg-card border border-border hover:border-brand/30 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-[12px] bg-bg-card border border-[var(--card-border)] flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-text-tertiary" />
            </div>
            <p className="text-text-secondary">No news available at the moment</p>
          </div>
        ) : (
          <div ref={contentRef} className="reveal">
            {/* Hero Article — first article gets magazine treatment */}
            {heroArticle && (
              <a
                href={heroArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(heroArticle.id)}
                className="group block mb-8 reveal-delay-1"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0 rounded-xl overflow-hidden border border-border bg-bg-card hover:border-brand/20 transition-colors">
                  {/* Hero image */}
                  <div className="relative aspect-[2/1] lg:aspect-auto bg-bg-secondary overflow-hidden">
                    {heroArticle.image ? (
                      <img
                        src={heroArticle.image}
                        alt={heroArticle.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex items-center justify-center min-h-[200px]",
                        heroArticle.isGenfinity
                          ? "bg-gradient-to-br from-purple-900/80 via-purple-800/60 to-purple-900/80"
                          : "bg-bg-secondary"
                      )}>
                        <Newspaper className="h-16 w-16 text-white/20" />
                      </div>
                    )}
                    {/* Date + Genfinity overlays */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/70 rounded-md text-white text-xs backdrop-blur-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(heroArticle.pubDate)}
                      </div>
                      {heroArticle.isGenfinity && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-medium rounded-md backdrop-blur-sm">
                          GENFINITY
                        </span>
                      )}
                    </div>
                    {/* Admin stats */}
                    {isAdmin && stats[heroArticle.id] && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-blue-300">
                          <Eye className="h-2.5 w-2.5" />
                          {stats[heroArticle.id].views}
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-green-300">
                          <MousePointerClick className="h-2.5 w-2.5" />
                          {stats[heroArticle.id].clicks}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hero content */}
                  <div className="p-5 sm:p-6 lg:p-8 flex flex-col justify-center">
                    {heroArticle.creator && (
                      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-tertiary mb-3">
                        {heroArticle.creator}
                      </p>
                    )}
                    <h2 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-text-primary leading-tight mb-3 group-hover:text-brand transition-colors">
                      {heroArticle.title}
                    </h2>
                    <p className="text-sm text-text-secondary line-clamp-3 mb-5 leading-relaxed">
                      {heroArticle.description}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm text-brand font-medium group-hover:gap-3 transition-all">
                      Read article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Rest of articles — compact row layout */}
            <div className="space-y-3">
              {restArticles.map((item, i) => (
                <NewsRow
                  key={item.id}
                  item={item}
                  formatDate={formatDate}
                  isAdmin={!!isAdmin}
                  stats={stats[item.id]}
                  onView={trackView}
                  onClick={trackClick}
                  delay={Math.min(i + 2, 6)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-bg-card border border-border hover:border-brand/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    if (!showPage) {
                      if (page === 2 || page === totalPages - 1) {
                        return (
                          <span key={page} className="px-2 text-text-tertiary text-sm">
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
                          "w-9 h-9 text-sm rounded-lg border transition-colors font-mono",
                          currentPage === page
                            ? "bg-brand border-brand text-white"
                            : "bg-bg-card border-border hover:border-brand/30"
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
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-bg-card border border-border hover:border-brand/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <p className="mt-4 text-center text-xs text-text-tertiary font-mono">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredNews.length)} of{" "}
                {filteredNews.length}
              </p>
            )}
          </div>
        )}

        {/* Footer credit */}
        <div className="mt-12 flex justify-center">
          <a
            href="https://genfinity.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-text-tertiary/60 hover:text-text-secondary transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40 group-hover:bg-purple-500 transition-colors" />
            <span>via <span className="font-medium">genfinity.io</span></span>
          </a>
        </div>
      </div>
    </div>
  );
}

/** Compact horizontal row for secondary articles */
function NewsRow({
  item,
  formatDate,
  isAdmin,
  stats,
  onView,
  onClick,
  delay,
}: {
  item: NewsItem;
  formatDate: (date: string) => string;
  isAdmin: boolean;
  stats?: { views: number; clicks: number };
  onView: (id: string) => void;
  onClick: (id: string) => void;
  delay: number;
}) {
  const cardRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onView(item.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [item.id, onView]);

  return (
    <a
      ref={cardRef}
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClick(item.id)}
      className={cn(
        `reveal-delay-${delay}`,
        "group flex gap-4 p-3 rounded-xl border border-border bg-bg-card hover:border-brand/40 transition-colors duration-200 duration-200"
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-24 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center",
            item.isGenfinity
              ? "bg-gradient-to-br from-purple-900/60 to-purple-800/40"
              : "bg-bg-secondary"
          )}>
            <Newspaper className="h-6 w-6 text-text-tertiary/40" />
          </div>
        )}
        {item.isGenfinity && (
          <div className="absolute top-1.5 right-1.5">
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-medium rounded backdrop-blur-sm">
              GEN
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-text-tertiary font-mono">
            {formatDate(item.pubDate)}
          </span>
          {item.creator && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary" />
              <span className="text-[10px] text-text-tertiary truncate">{item.creator}</span>
            </>
          )}
          {/* Admin stats inline */}
          {isAdmin && stats && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary" />
              <span className="text-[10px] text-blue-400 font-mono flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />{stats.views}
              </span>
              <span className="text-[10px] text-green-400 font-mono flex items-center gap-0.5">
                <MousePointerClick className="h-2.5 w-2.5" />{stats.clicks}
              </span>
            </>
          )}
        </div>

        <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {item.title}
        </h3>

        <p className="text-xs text-text-secondary/70 line-clamp-1 mt-1 hidden sm:block">
          {item.description}
        </p>
      </div>

      {/* Arrow */}
      <div className="hidden sm:flex items-center flex-shrink-0">
        <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
      </div>
    </a>
  );
}
