"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowsLeftRight,
  Diamond,
  UsersThree,
  Compass,
  Lightbulb,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  Coins,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

interface OnboardingLink {
  label: string;
  href: string;
  description?: string;
  logo?: string;
}

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  iconWeight?: "duotone" | "fill" | "regular";
  color: string; // tailwind color name: teal, amber, violet, sky, purple, emerald
  links: OnboardingLink[];
  tip?: string;
}

const STEPS: OnboardingStep[] = [
  {
    number: 1,
    title: "Create Your Wallet",
    description:
      "A Hedera wallet lets you hold HBAR, NFTs, and interact with the ecosystem. HashPack is the most popular wallet — it works as a browser extension and mobile app.",
    icon: Wallet,
    iconWeight: "duotone",
    color: "teal",
    links: [
      {
        label: "HashPack",
        href: "https://www.hashpack.app/",
        description: "Browser extension & mobile",
        logo: "/logos/hashpack.png",
      },
    ],
    tip: "HashPack supports all Hedera features including NFTs, tokens, staking, and dApp connections.",
  },
  {
    number: 2,
    title: "Get Your First HBAR",
    description:
      "HBAR is Hedera's native cryptocurrency. You need a small amount for transaction fees (usually less than $0.01 per transaction). You can get free HBAR from the Hashport faucet.",
    icon: Coins,
    color: "amber",
    links: [
      {
        label: "Hashport Faucet",
        href: "https://faucet.hashport.network/",
        description: "Get free HBAR",
        logo: "/logos/hashport.png",
      },
    ],
    tip: "Hedera transactions cost fractions of a cent — $1 of HBAR can last you thousands of transactions.",
  },
  {
    number: 3,
    title: "Swap Tokens",
    description:
      "Decentralized exchanges (DEXes) let you trade HBAR for other tokens built on Hedera. Swap between HBAR and hundreds of tokens with low fees and fast settlements.",
    icon: ArrowsLeftRight,
    iconWeight: "duotone",
    color: "violet",
    links: [
      {
        label: "SaucerSwap",
        href: "https://www.saucerswap.finance/",
        description: "Largest Hedera DEX",
        logo: "/logos/saucerswap.png",
      },
      {
        label: "SilkSwap",
        href: "https://silkswap.io/",
        description: "Smart Nodes technology",
        logo: "/logos/silkswap.png",
      },
    ],
    tip: "Always check the token you're swapping for — verify the token ID on Hedera explorers before trading.",
  },
  {
    number: 4,
    title: "Lend & Borrow",
    description:
      "DeFi lending lets you earn yield on your HBAR and tokens by lending them out, or borrow against your holdings. Bonzo Finance is the leading lending protocol on Hedera.",
    icon: Coins,
    color: "sky",
    links: [
      {
        label: "Bonzo Finance",
        href: "https://app.bonzo.finance/lend",
        description: "Lending & borrowing",
        logo: "/logos/bonzo.png",
      },
    ],
    tip: "Start with small amounts to understand how lending works before committing larger positions.",
  },
  {
    number: 5,
    title: "Explore NFTs",
    description:
      "Hedera has a thriving NFT ecosystem with extremely low minting and trading fees. Browse collections, discover new artists, and participate in upcoming mints.",
    icon: Diamond,
    iconWeight: "duotone",
    color: "purple",
    links: [
      {
        label: "SentX",
        href: "https://sentx.io/",
        description: "NFT marketplace",
        logo: "/logos/sentx.png",
      },
    ],
    tip: "Use Hashly's Calendar to stay updated on upcoming NFT mints and community events.",
  },
  {
    number: 6,
    title: "Join the Community",
    description:
      "The Hedera community is active and welcoming. Join Discord for real-time discussions, follow on X for updates, and use Hashly to vote on your favorite projects and earn rewards.",
    icon: UsersThree,
    iconWeight: "duotone",
    color: "emerald",
    links: [
      {
        label: "Explore Hashly",
        href: "/",
        description: "Vote & earn points",
        logo: "/logos/hashly.png",
      },
      {
        label: "@HashlyApp on X",
        href: "https://x.com/HashlyApp",
        description: "Follow us",
        logo: "/logos/x.png",
      },
      {
        label: "El Santuario Discord",
        href: "https://discord.gg/elsantuario",
        description: "Community hub",
        logo: "/logos/discord.png",
      },
    ],
    tip: "Connect your wallet on Hashly to vote on projects, complete missions, and climb the leaderboard.",
  },
];

// Color map for dynamic tailwind classes
const COLOR_MAP: Record<string, { dot: string; icon: string; bg: string; border: string; glow: string; gradient: string; ring: string }> = {
  teal:    { dot: "bg-teal-500",    icon: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/30",    glow: "shadow-[0_0_24px_rgba(45,212,191,0.2)]",    gradient: "from-teal-500/20 to-teal-500/0",    ring: "ring-teal-500/20" },
  amber:   { dot: "bg-amber-500",   icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   glow: "shadow-[0_0_24px_rgba(251,191,36,0.2)]",   gradient: "from-amber-500/20 to-amber-500/0",   ring: "ring-amber-500/20" },
  violet:  { dot: "bg-violet-500",  icon: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  glow: "shadow-[0_0_24px_rgba(139,92,246,0.2)]",  gradient: "from-violet-500/20 to-violet-500/0",  ring: "ring-violet-500/20" },
  sky:     { dot: "bg-sky-500",     icon: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     glow: "shadow-[0_0_24px_rgba(14,165,233,0.2)]",  gradient: "from-sky-500/20 to-sky-500/0",     ring: "ring-sky-500/20" },
  purple:  { dot: "bg-purple-500",  icon: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  glow: "shadow-[0_0_24px_rgba(168,85,247,0.2)]",  gradient: "from-purple-500/20 to-purple-500/0",  ring: "ring-purple-500/20" },
  emerald: { dot: "bg-emerald-500", icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_24px_rgba(16,185,129,0.2)]", gradient: "from-emerald-500/20 to-emerald-500/0", ring: "ring-emerald-500/20" },
};

function StepCard({ step, isLast }: { step: OnboardingStep; isLast: boolean }) {
  const ref = useReveal();
  const Icon = step.icon;
  const c = COLOR_MAP[step.color];

  return (
    <div ref={ref} className="reveal relative pl-14 sm:pl-16 pb-10 sm:pb-14">
      {/* Timeline connector — animated gradient line */}
      {!isLast && (
        <div className="absolute left-[19px] sm:left-[23px] top-14 bottom-0 w-px">
          <div className={cn("w-full h-full bg-gradient-to-b", c.gradient, "via-border/30 to-transparent")} />
        </div>
      )}

      {/* Timeline node — icon instead of number */}
      <div
        className={cn(
          "absolute left-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full",
          "bg-bg-card border-2 flex items-center justify-center z-10",
          "ring-4 ring-offset-0",
          c.border, c.glow, c.ring
        )}
      >
        <Icon
          className={cn("h-4 w-4 sm:h-5 sm:w-5", c.icon)}
          {...(step.iconWeight ? { weight: step.iconWeight } : {})}
        />
      </div>

      {/* Card */}
      <div className={cn(
        "rounded-xl overflow-hidden",
        "bg-bg-card border border-border",
        "hover:border-text-tertiary/20 transition-all duration-300",
        "hover:shadow-lg hover:shadow-black/10"
      )}>
        <div className="p-5 sm:p-6">
          {/* Step badge + Title */}
          <div className="flex items-start gap-3 mb-3">
            <span className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold font-mono flex-shrink-0 mt-0.5",
              c.bg, c.icon
            )}>
              {step.number}
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary leading-tight">
                {step.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed mb-4 ml-9">
            {step.description}
          </p>

          {/* Tip */}
          {step.tip && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-brand/[0.04] border border-brand/10 mb-5 ml-9">
              <Lightbulb
                className="h-4 w-4 text-brand mt-0.5 flex-shrink-0"
                weight="fill"
              />
              <p className="text-xs text-text-secondary/80 leading-relaxed">
                {step.tip}
              </p>
            </div>
          )}

          {/* Links — elevated cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ml-9">
            {step.links.map((link) => {
              const isInternal = link.href.startsWith("/");
              const LinkTag = isInternal ? Link : "a";
              const linkProps = isInternal
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" };

              return (
                <LinkTag
                  key={link.label}
                  href={link.href}
                  {...linkProps}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl",
                    "bg-bg-secondary/40 border border-border/80",
                    "hover:bg-bg-secondary/70 hover:border-text-tertiary/20",
                    "hover:shadow-md hover:shadow-black/5",
                    "transition-all duration-200 group",
                    "active:scale-[0.98]"
                  )}
                >
                  {link.logo && (
                    <div className="w-10 h-10 rounded-xl bg-bg-tertiary/40 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-border/50 group-hover:ring-text-tertiary/20 transition-all">
                      <img
                        src={link.logo}
                        alt=""
                        className="w-7 h-7 object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors block truncate">
                      {link.label}
                    </span>
                    {link.description && (
                      <span className="text-[11px] text-text-tertiary block mt-0.5">
                        {link.description}
                      </span>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-tertiary/50 flex-shrink-0 group-hover:text-brand/60 transition-colors" />
                </LinkTag>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const headerRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div ref={headerRef} className="reveal pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight mb-3 reveal-delay-1">
            Get Started with{" "}
            <span className="gradient-text">Hedera</span>
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed reveal-delay-2">
            Everything you need to go from zero to fully set up in the Hedera ecosystem. Follow these {STEPS.length} steps.
          </p>

          {/* Quick nav pills */}
          <div className="flex flex-wrap gap-2 mt-5 reveal-delay-3">
            {STEPS.map((step) => {
              const c = COLOR_MAP[step.color];
              return (
                <span
                  key={step.number}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-bg-card border border-border text-text-secondary"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
                  {step.title}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <div className="relative mt-2 sm:mt-4">
          {STEPS.map((step, i) => (
            <StepCard
              key={step.number}
              step={step}
              isLast={i === STEPS.length - 1}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div ref={ctaRef} className="reveal mt-6 sm:mt-10">
          <div className={cn(
            "relative overflow-hidden rounded-2xl",
            "bg-gradient-to-br from-brand/10 via-bg-card to-bg-card",
            "border border-brand/15",
            "p-8 sm:p-10 text-center"
          )}>
            {/* Decorative glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-4">
                <CheckCircle className="h-7 w-7 text-brand" weight="fill" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
                You&apos;re all set!
              </h3>
              <p className="text-sm sm:text-base text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">
                Connect your wallet on Hashly to start voting on projects,
                completing missions, and earning rewards.
              </p>
              <Link href="/">
                <Button className="gap-2 px-6 h-11 text-base shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                  <Sparkles className="h-4 w-4" />
                  Start Exploring
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
