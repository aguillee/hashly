import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "HashWorld — Map the Hedera Community Worldwide",
  description:
    "HashWorld: an interactive 3D globe mapping the Hedera ecosystem. Discover community members and projects worldwide, connect on X, and pin your location.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "HashWorld — Hedera Community Globe | Hashly",
    description:
      "Interactive 3D globe mapping the Hedera community worldwide. Find people & projects, connect on X.",
    url: "/community",
  },
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
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading globe...</p>
        </div>
      </div>
    ),
  }
);

export default function CommunityPage() {
  return (
    <div className="w-full h-full overflow-hidden">
      <CommunityGlobe />
    </div>
  );
}
