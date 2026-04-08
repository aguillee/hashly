"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ArrowRight, ExternalLink, Vote, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HomeAdCarousel } from "@/components/ads/HomeAdCarousel";
import { useWalletStore } from "@/store";
import { useHomeAds } from "@/lib/swr";
import { useReveal } from "@/hooks/useReveal";

export function HeroSection() {
  const { isConnected } = useWalletStore();
  const { data: homeAdsData } = useHomeAds();
  const homeAds = homeAdsData?.ads || [];
  const hasAds = homeAds.length > 0;
  const revealRef = useReveal();

  return (
    <section ref={revealRef} className="reveal px-4 sm:px-6 pt-4 pb-1 sm:pt-6 sm:pb-2">
      <div className={`grid ${hasAds ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-1"} gap-4 lg:gap-8 items-stretch ${!hasAds ? "max-w-3xl mx-auto text-center" : ""}`}>

        {/* Left: Title + CTA */}
        <div className={`space-y-3 sm:space-y-4 ${!hasAds ? "flex flex-col items-center" : ""}`}>
          {/* Mono label */}
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary reveal-delay-1">
            Hedera Ecosystem
          </p>

          {/* Heading */}
          <h1 className="text-3xl lg:text-[40px] font-bold leading-tight tracking-tight gradient-text reveal-delay-2">
            Discover what's happening on Hedera
          </h1>

          <p className="text-sm text-text-secondary max-w-[50ch] reveal-delay-2">
            Giving visibility to projects building on Hedera — community-driven rankings powered by on-chain voting
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-3 reveal-delay-3">
            {isConnected ? (
              <Link href="/events/new">
                <Button variant="brand" className="gap-2 group">
                  <Plus className="h-4 w-4" />
                  Submit Event
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/calendar">
                <Button variant="brand" className="gap-2 group">
                  Explore Events
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            )}
            <a
              href="https://x.com/hashly_h"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 border border-border rounded-lg hover:border-[var(--card-border-hover)]"
            >
              Collaborate? <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* How It Works — detailed voting explanation */}
          <div className={`bg-bg-card border border-[var(--card-border)] rounded-xl p-4 space-y-3 reveal-delay-4 w-full ${!hasAds ? "text-left" : ""}`}>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-tertiary">
                How Voting Works
              </p>
              <span className="text-text-tertiary/30">·</span>
              <a
                href="https://hashly.gitbook.io/hashly-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80 font-medium transition-colors whitespace-nowrap"
              >
                <FileText className="h-3 w-3" />
                Full Documentation
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Base vote */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <Vote className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Base Vote</p>
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    Every wallet gets <span className="text-brand font-medium">1 vote</span> per event
                  </p>
                </div>
              </div>

              {/* Dragon boost */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-yellow-500/20">
                  <img src="https://kabila-arweave.b-cdn.net/iYYnkwu5x54DbK-mSnK-kGmnxZsvO-yTonRvhBHbB_8" alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Dragon NFT</p>
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    <span className="text-yellow-500 font-medium">+1 vote</span> per Santuario Hedera NFT held
                  </p>
                  <a href="/rarity" className="text-[10px] text-yellow-500 hover:text-yellow-400 font-medium transition-colors">
                    View rarity ranks →
                  </a>
                </div>
              </div>

              {/* El Santuario boost */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-purple-500/20">
                  <img src="https://launchpad-assets.kabila.app/logo/0.0.9954622/JPLTxQfsoC/logo.png" alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">El Santuario</p>
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    <span className="text-purple-400 font-medium">+5 votes</span> if you hold an El Santuario NFT
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-2">
              <p className="text-[10px] text-text-tertiary">
                All votes are recorded on-chain via HCS (Hedera Consensus Service) for full transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Ad Carousel — only shown when ads exist */}
        {hasAds && (
          <div className="h-56 sm:h-64 lg:h-full min-h-[200px] rounded-xl overflow-hidden reveal-delay-2">
            <HomeAdCarousel ads={homeAds} />
          </div>
        )}
      </div>
    </section>
  );
}
