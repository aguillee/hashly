import Link from "next/link";
import { ArrowLeft, Compass, Calendar, Users } from "lucide-react";

export const metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist on Hashly.",
};

const suggestions = [
  { href: "/calendar", icon: Calendar, label: "Events calendar", desc: "Upcoming mints, meetups, hackathons" },
  { href: "/community", icon: Users, label: "HashWorld", desc: "The ecosystem map" },
  { href: "/leaderboard", icon: Compass, label: "Leaderboard", desc: "Who's shaping Hedera" },
];

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Floating 404 mark */}
        <div className="relative mb-10">
          <div className="relative text-[120px] sm:text-[160px] leading-none font-semibold text-text-primary tracking-[-0.05em] select-none">
            <span className="inline-block text-brand">4</span>
            <span className="inline-block">0</span>
            <span className="inline-block text-accent-coral">4</span>
            {/* Soft glow behind */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 blur-2xl opacity-40"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(58,204,184,0.3), transparent 70%)",
              }}
            />
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-3">
          Dead link
        </p>
        <h1 className="text-[22px] sm:text-[26px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.2] mb-2">
          This page doesn't exist
        </h1>
        <p className="text-text-secondary text-sm max-w-sm mx-auto mb-10">
          The link might be broken, the event removed, or the page moved somewhere
          else. Try one of these:
        </p>

        {/* Suggestions */}
        <div className="space-y-2 mb-8 text-left">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-3 px-3.5 h-14 rounded-[12px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-[9px] bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary leading-tight tracking-tight">
                    {s.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary leading-tight mt-0.5 truncate">
                    {s.desc}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="text-text-tertiary group-hover:text-brand transition-colors"
                >
                  →
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back home
        </Link>
      </div>
    </div>
  );
}
