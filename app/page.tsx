"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { BadgesStrip } from "@/components/home/BadgesStrip";
import { HomeCollectionsSection } from "@/components/home/HomeCollectionsSection";
import { HomeTokensSection } from "@/components/home/HomeTokensSection";
import { MeetupsHackathonsSection } from "@/components/home/MeetupsHackathonsSection";
import { NFTEventsSection } from "@/components/home/NFTEventsSection";

export default function HomePage() {
  return (
    <div className="min-h-screen pb-12">

      {/* Hero: Asymmetric split — title left, ad/featured right */}
      <HeroSection />

      <hr className="section-divider" />

      {/* Attendance Badges: Horizontal scroll strip */}
      <BadgesStrip />

      <hr className="section-divider" />

      {/* Meetups + Hackathons: Asymmetric side-by-side */}
      <MeetupsHackathonsSection />

      <hr className="section-divider" />

      {/* NFT Events: Column cards below meetups/hackathons */}
      <NFTEventsSection />

      <hr className="section-divider" />

      {/* Top Collections + Top Tokens: Side by side */}
      <section className="px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <HomeCollectionsSection />
          <HomeTokensSection />
        </div>
      </section>

    </div>
  );
}
