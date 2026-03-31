"use client";

import * as React from "react";
import {
  Wallet,
  ExternalLink,
  Search,
  Loader2,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioData {
  hbar: { balance: number; priceUsd: number; valueUsd: number };
  tokens: Array<{
    tokenId: string;
    name: string;
    symbol: string;
    balance: number;
    decimals: number;
    priceUsd: number;
    valueUsd: number;
    icon: string;
  }>;
  nfts: Array<{
    tokenId: string;
    name: string;
    count: number;
    serials: number[];
    imageUrl: string | null;
  }>;
  totalValueUsd: number;
  summary: {
    totalTokens: number;
    totalNftCollections: number;
    totalNfts: number;
  };
}

/* ─── Donut chart (SVG) ─── */
const PALETTE = [
  "#14B8A6", "#8B5CF6", "#F59E0B", "#3B82F6",
  "#EF4444", "#EC4899", "#10B981", "#6366F1",
];

function DonutChart({
  data,
  total,
  hovered,
  setHovered,
}: {
  data: { name: string; value: number }[];
  total: number;
  hovered: number | null;
  setHovered: (i: number | null) => void;
}) {
  const strokeWidth = 14;
  const r = 44 - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;

  let cumPct = 0;
  const segments = data.map((d, i) => {
    const pct = (d.value / total) * 100;
    const dashLen = (pct / 100) * circumference;
    const dashGap = circumference - dashLen;
    const offset = -((cumPct / 100) * circumference) + circumference * 0.25;
    cumPct += pct;
    return { ...d, i, pct, dashLen, dashGap, offset };
  });

  const active = hovered !== null ? data[hovered] : null;
  const activePct = active ? ((active.value / total) * 100).toFixed(1) : null;

  return (
    <div className="relative flex-shrink-0 w-[120px] h-[120px]">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {segments.map((seg) => (
          <circle
            key={seg.name}
            cx={50}
            cy={50}
            r={r}
            fill="none"
            stroke={PALETTE[seg.i % PALETTE.length]}
            strokeWidth={hovered === seg.i ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={`${seg.dashLen} ${seg.dashGap}`}
            strokeDashoffset={seg.offset}
            className="transition-all duration-200 cursor-pointer"
            style={{ opacity: hovered !== null && hovered !== seg.i ? 0.25 : 1 }}
            onMouseEnter={() => setHovered(seg.i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {active ? (
          <div className="text-center">
            <span className="block text-[10px] font-medium text-text-secondary truncate max-w-[56px]">
              {active.name}
            </span>
            <span className="block text-[13px] font-bold font-mono text-text-primary tabular-nums">
              {activePct}%
            </span>
          </div>
        ) : (
          <div className="text-center">
            <span className="block text-[15px] font-bold font-mono text-text-primary tabular-nums">
              ${total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toFixed(0)}
            </span>
            <span className="block text-[9px] text-text-tertiary mt-0.5">total</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Format helpers ─── */
function fmtBalance(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtPrice(p: number) {
  if (p === 0) return null;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function fmtUsd(v: number) {
  if (v === 0) return null;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/* ─── Main Component ─── */
export function PortfolioDashboard({
  walletAddress,
}: {
  walletAddress: string;
}) {
  const [portfolio, setPortfolio] = React.useState<PortfolioData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tokenSearch, setTokenSearch] = React.useState("");
  const [showSmallTokens, setShowSmallTokens] = React.useState(false);
  const [chartHover, setChartHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/users/portfolio");
        if (res.ok) setPortfolio(await res.json());
      } catch (e) {
        console.error("Portfolio fetch failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="rounded-2xl bg-bg-card border border-border p-8 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="w-[120px] h-[120px] rounded-full bg-bg-secondary" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-40 rounded-lg bg-bg-secondary" />
            <div className="h-4 w-24 rounded bg-bg-secondary" />
            <div className="flex gap-3 mt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 w-20 rounded-lg bg-bg-secondary" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="rounded-2xl bg-bg-card border border-border p-12 text-center">
        <Wallet className="h-6 w-6 text-text-tertiary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">Failed to load portfolio</p>
      </div>
    );
  }

  /* ─── Derived data ─── */
  const mainTokens = portfolio.tokens.filter((t) => t.valueUsd >= 1);
  const smallTokens = portfolio.tokens.filter((t) => t.valueUsd < 1);
  const q = tokenSearch.toLowerCase();
  const filteredSmall = q
    ? smallTokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.tokenId.includes(tokenSearch)
      )
    : [];
  const visibleTokens = showSmallTokens ? [...mainTokens, ...filteredSmall] : mainTokens;

  // Chart data — sorted by value desc
  const chartEntries = [
    { name: "HBAR", value: portfolio.hbar.valueUsd },
    ...portfolio.tokens.filter((t) => t.valueUsd > 0).map((t) => ({ name: t.symbol, value: t.valueUsd })),
  ].sort((a, b) => b.value - a.value);
  const topChart = chartEntries.slice(0, 7);
  const otherVal = chartEntries.slice(7).reduce((s, x) => s + x.value, 0);
  const chartData = otherVal > 0 ? [...topChart, { name: "Other", value: otherVal }] : topChart;
  const chartTotal = chartData.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-2xl bg-bg-card border border-border overflow-hidden">
      {/* ─── Header: Chart + Stats ─── */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-text-primary">Portfolio</span>
          </div>
          <a
            href={`https://hashscan.io/mainnet/account/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-brand transition-colors"
          >
            HashScan
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          {chartTotal > 0 && (
            <DonutChart
              data={chartData}
              total={chartTotal}
              hovered={chartHover}
              setHovered={setChartHover}
            />
          )}

          {/* Stats + Legend */}
          <div className="flex-1 w-full">
            {/* Total value */}
            <p className="text-3xl font-bold text-text-primary font-mono tabular-nums tracking-tight">
              ${portfolio.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>

            {/* HBAR + token breakdown */}
            <div className="flex items-center gap-4 mt-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-brand font-bold text-[11px]">ℏ</span>
                <span className="text-[12px] font-mono text-text-secondary tabular-nums">
                  {portfolio.hbar.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })} HBAR
                </span>
                <span className="text-[11px] font-mono text-text-tertiary">
                  ({fmtUsd(portfolio.hbar.valueUsd) || "$0"})
                </span>
              </div>
              <span className="text-border">|</span>
              <span className="text-[12px] font-mono text-text-secondary tabular-nums">
                {portfolio.summary.totalTokens} tokens
              </span>
            </div>

            {/* Legend grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
              {chartData.map((d, i) => (
                <div
                  key={d.name}
                  className="flex items-center gap-1.5 min-w-0 py-0.5 cursor-pointer transition-opacity duration-150"
                  style={{ opacity: chartHover !== null && chartHover !== i ? 0.3 : 1 }}
                  onMouseEnter={() => setChartHover(i)}
                  onMouseLeave={() => setChartHover(null)}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                    style={{
                      backgroundColor: PALETTE[i % PALETTE.length],
                      transform: chartHover === i ? "scale(1.5)" : "scale(1)",
                    }}
                  />
                  <span className="text-[11px] text-text-secondary truncate">{d.name}</span>
                  <span className="text-[10px] font-mono text-text-tertiary ml-auto tabular-nums">
                    {((d.value / chartTotal) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Token list ─── */}
      {portfolio.tokens.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-t border-b border-border bg-white/[0.01]">
            <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">Assets</span>
            <div className="hidden sm:flex items-center text-[9px] font-mono uppercase tracking-wider text-text-tertiary gap-8">
              <span className="w-20 text-right">Price</span>
              <span className="w-20 text-right">Balance</span>
              <span className="w-16 text-right">Value</span>
            </div>
          </div>

          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {visibleTokens.map((token) => (
              <a
                key={token.tokenId}
                href={`https://hashscan.io/mainnet/token/${token.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 sm:px-6 py-2.5 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {token.icon ? (
                    <img
                      src={token.icon}
                      alt=""
                      className="w-8 h-8 rounded-full flex-shrink-0 bg-bg-secondary"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-text-tertiary text-[9px] font-bold">
                        {token.symbol.slice(0, 3)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary group-hover:text-brand transition-colors leading-tight truncate">
                      {token.symbol}
                    </p>
                    <p className="text-[10px] text-text-tertiary leading-tight truncate">
                      {token.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 flex-shrink-0">
                  <span className="hidden sm:block w-20 text-right text-[11px] text-text-secondary font-mono tabular-nums">
                    {fmtPrice(token.priceUsd) || "—"}
                  </span>
                  <span className="w-20 text-right text-[11px] text-text-primary font-mono tabular-nums">
                    {fmtBalance(token.balance)}
                  </span>
                  <span
                    className={cn(
                      "w-16 text-right text-[11px] font-bold font-mono tabular-nums",
                      token.valueUsd > 0 ? "text-text-primary" : "text-text-tertiary"
                    )}
                  >
                    {fmtUsd(token.valueUsd) || "—"}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Small tokens toggle + search */}
          {smallTokens.length > 0 && (
            <div className="border-t border-border">
              <button
                onClick={() => setShowSmallTokens(!showSmallTokens)}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-[11px] text-text-tertiary hover:text-brand transition-colors"
              >
                {showSmallTokens ? "Hide small tokens" : `Show ${smallTokens.length} tokens under $1`}
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", showSmallTokens && "rotate-180")}
                />
              </button>
              {showSmallTokens && (
                <div className="px-5 sm:px-6 pb-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder="Search by name or symbol..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-bg-secondary border border-border text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {portfolio.tokens.length === 0 && portfolio.hbar.balance === 0 && (
        <div className="p-12 text-center">
          <Wallet className="h-7 w-7 text-text-tertiary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">No assets found</p>
        </div>
      )}
    </div>
  );
}
