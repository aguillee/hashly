import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "HashWorld | Hashly",
  description:
    "HashWorld: Mapping the Hedera Ecosystem. Discover the Hedera community worldwide, find people and projects, follow them on X.",
};

// Dynamic import — react-globe.gl needs WebGL (no SSR)
const CommunityGlobe = dynamic(
  () =>
    import("@/components/community/CommunityGlobe").then(
      (mod) => mod.CommunityGlobe
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading globe...</p>
        </div>
      </div>
    ),
  }
);

export default function CommunityPage() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] overflow-hidden">
      <CommunityGlobe />
    </div>
  );
}
