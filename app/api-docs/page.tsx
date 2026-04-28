"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Copy,
  Check,
  KeyRound,
  Zap,
  Server,
  Activity,
  Terminal,
  FileJson,
  Globe,
} from "lucide-react";
import { useWalletStore } from "@/store";
import { cn } from "@/lib/utils";
import "swagger-ui-react/swagger-ui.css";

// Swagger UI is heavy and renders client-only. Lazy-load to keep the rest
// of the bundle clean.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-[10px] bg-bg-secondary/40 border border-[var(--border-subtle)] animate-pulse"
        />
      ))}
    </div>
  ),
});

type Lang = "curl" | "js" | "python";

const SAMPLE_KEY_HINT = "YOUR_API_KEY";

export default function ApiDocsPage() {
  const { isConnected, user } = useWalletStore();
  const [copied, setCopied] = React.useState<string | null>(null);
  const [lang, setLang] = React.useState<Lang>("curl");
  const [endpointCount, setEndpointCount] = React.useState<number | null>(null);
  const [version, setVersion] = React.useState<string | null>(null);

  // Wait until the wallet store has hydrated before deciding to render.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  // Pull lightweight metadata from the spec so the header chips are accurate
  // without us hard-coding numbers in the page.
  React.useEffect(() => {
    if (!hydrated || !user?.isAdmin) return;
    fetch("/api/v1/openapi.json")
      .then((r) => r.json())
      .then((spec) => {
        setEndpointCount(Object.keys(spec.paths || {}).length);
        setVersion(spec.info?.version || null);
      })
      .catch(() => {});
  }, [hydrated, user?.isAdmin]);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Hard gate: only authenticated admins ever render the spec.
  if (!isConnected || !user?.isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-error/10 border border-error/25 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-error" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
            Restricted
          </p>
          <h1 className="text-[22px] sm:text-[26px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.2] mb-2">
            API documentation is private
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            This page is only visible to Hashly admins. If you're a builder
            and want to integrate with Hashly's read-only API, reach out to
            us on X.
          </p>
          <a
            href="https://x.com/hashly_h"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-[10px] bg-brand text-[#041512] text-[13px] font-medium hover:brightness-110 transition-[filter]"
          >
            Contact @hashly_h
          </a>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary/70 transition-colors"
            >
              ← Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "/api/v1";

  const samples: Record<Lang, string> = {
    curl: `curl -H "Authorization: Bearer ${SAMPLE_KEY_HINT}" \\
  ${baseUrl}/events?limit=5`,
    js: `const res = await fetch("${baseUrl}/events?limit=5", {
  headers: { Authorization: "Bearer ${SAMPLE_KEY_HINT}" },
});
const data = await res.json();`,
    python: `import requests

r = requests.get(
    "${baseUrl}/events",
    params={"limit": 5},
    headers={"Authorization": "Bearer ${SAMPLE_KEY_HINT}"},
)
print(r.json())`,
  };

  const handleCopy = async (key: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const langTabs: { value: Lang; label: string; icon: React.ReactNode }[] = [
    { value: "curl", label: "cURL", icon: <Terminal className="h-3.5 w-3.5" /> },
    { value: "js", label: "JavaScript", icon: <FileJson className="h-3.5 w-3.5" /> },
    { value: "python", label: "Python", icon: <FileJson className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden pt-6 sm:pt-10 pb-6">
        {/* Subtle decoration glow */}
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-[440px] h-[440px] rounded-full opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(58,204,184,0.18), transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-2">
                Internal · Admin only
              </p>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-[34px] sm:text-[44px] font-semibold text-text-primary tracking-[-0.025em] leading-[1.05]">
                  Hashly API
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[8px] bg-brand/10 border border-brand/25 text-brand text-[11px] font-semibold tabular-nums mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  v{version || "1.0.0"}
                </span>
              </div>
              <p className="text-text-secondary text-[15px] max-w-2xl leading-relaxed">
                Read-only HTTP API to Hashly's public datasets — events,
                leaderboard, tokens, NFT collections and ecosystem projects on
                Hedera. Bearer-key authenticated, JSON in, JSON out.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[8px] bg-error/10 border border-error/25 text-error text-[11px] font-semibold flex-shrink-0">
              <Lock className="h-3 w-3" />
              Private
            </span>
          </div>

          {/* Stat chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] text-[12px]">
              <Server className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">Base URL</span>
              <code className="text-text-primary font-mono text-[12px] tabular-nums">{baseUrl}</code>
              <button
                onClick={() => handleCopy("base", baseUrl)}
                aria-label="Copy base URL"
                className="ml-1 p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors active:scale-95"
              >
                {copied === "base" ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </span>

            <span className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] text-[12px]">
              <Activity className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">Endpoints</span>
              <span className="font-semibold text-text-primary tabular-nums">
                {endpointCount ?? "…"}
              </span>
            </span>

            <span className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] text-[12px]">
              <Zap className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">Methods</span>
              <span className="inline-flex items-center px-1.5 h-5 rounded-[5px] bg-brand/12 border border-brand/25 text-brand text-[10px] font-semibold">GET</span>
            </span>

            <span className="inline-flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] text-[12px]">
              <KeyRound className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary uppercase tracking-wider text-[10px] font-medium">Auth</span>
              <span className="font-semibold text-text-primary">Bearer</span>
            </span>

            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] bg-bg-card border border-[var(--card-border)] hover:border-brand/40 hover:text-brand transition-colors text-[12px] font-medium text-text-secondary active:scale-[0.97]"
            >
              <FileJson className="h-3.5 w-3.5" />
              openapi.json
            </a>
          </div>
        </div>
      </section>

      {/* ───── Quick start (multi-language) ───── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mb-7">
        <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden">
          <div className="px-5 h-12 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-[7px] bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Terminal className="h-3.5 w-3.5 text-brand" />
              </div>
              <span className="font-semibold text-[13px] text-text-primary tracking-tight">
                Quick start
              </span>
            </div>

            {/* Language tabs */}
            <div className="inline-flex h-8 p-0.5 rounded-[8px] border border-[var(--card-border)] bg-bg-secondary/40">
              {langTabs.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setLang(t.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 rounded-[6px] text-[11px] font-medium",
                    "transition-[background-color,color,box-shadow] duration-200 ease-out",
                    lang === t.value
                      ? "bg-brand/12 text-brand shadow-[inset_0_1px_0_rgba(58,204,184,0.12)]"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="relative group">
              <pre className="overflow-x-auto rounded-[10px] bg-[#0A0B10] border border-[var(--border-subtle)] px-4 py-3.5 text-[12.5px] text-text-primary font-mono leading-relaxed">
                <code>{samples[lang]}</code>
              </pre>
              <button
                onClick={() => handleCopy("sample", samples[lang])}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 h-7 rounded-[7px] bg-bg-card/80 backdrop-blur border border-[var(--card-border)] text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors active:scale-95 opacity-80 group-hover:opacity-100"
              >
                {copied === "sample" ? (
                  <>
                    <Check className="h-3 w-3 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3">
              Replace{" "}
              <code className="font-mono text-text-secondary px-1 rounded bg-bg-secondary/60">
                {SAMPLE_KEY_HINT}
              </code>{" "}
              with a key from the{" "}
              <code className="font-mono text-text-secondary px-1 rounded bg-bg-secondary/60">
                HASHLY_API_KEYS
              </code>{" "}
              environment variable. You can also pass it as{" "}
              <code className="font-mono text-text-secondary px-1 rounded bg-bg-secondary/60">
                ?api_key=…
              </code>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ───── Reference (Swagger UI) ───── */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-text-tertiary" />
          <h2 className="text-[10px] uppercase tracking-[0.16em] font-medium text-text-tertiary">
            Reference
          </h2>
          <div className="h-px flex-1 bg-[var(--border-subtle)] ml-2" />
        </div>

        <div className="rounded-[14px] border border-[var(--card-border)] bg-bg-card overflow-hidden swagger-host">
          <SwaggerUI
            url="/api/v1/openapi.json"
            docExpansion="list"
            deepLinking
            persistAuthorization
            tryItOutEnabled
            displayOperationId={false}
            displayRequestDuration
          />
        </div>
      </section>

      {/* ───── Swagger UI dark theme overrides ───── */}
      <style jsx global>{`
        /* Reset Swagger's default light surfaces and use our token system */
        .swagger-host .swagger-ui,
        .swagger-host .swagger-ui .info,
        .swagger-host .swagger-ui .scheme-container,
        .swagger-host .swagger-ui .opblock-tag,
        .swagger-host .swagger-ui .opblock,
        .swagger-host .swagger-ui .model-box {
          background: transparent !important;
          color: var(--text-primary) !important;
          font-family: var(--font-sora), system-ui, sans-serif !important;
          box-shadow: none !important;
        }

        /* Top auth bar */
        .swagger-host .swagger-ui .scheme-container {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary) !important;
        }
        .swagger-host .swagger-ui .scheme-container .schemes-title {
          color: var(--text-secondary) !important;
        }

        /* Hide redundant info section (we have our own hero) */
        .swagger-host .swagger-ui .info {
          display: none;
        }

        /* Tag headers (Events, Tokens, etc.) */
        .swagger-host .swagger-ui .opblock-tag {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.02em;
          padding: 14px 20px;
          margin: 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .swagger-host .swagger-ui .opblock-tag small {
          color: var(--text-tertiary) !important;
          font-weight: 400;
          font-size: 12px;
        }
        .swagger-host .swagger-ui .opblock-tag svg {
          fill: var(--text-tertiary);
        }

        /* Operation cards */
        .swagger-host .swagger-ui .opblock {
          border-radius: 12px;
          margin: 12px 16px;
          border-color: var(--card-border);
          background: var(--bg-secondary) !important;
          transition: border-color 200ms ease;
        }
        .swagger-host .swagger-ui .opblock:hover {
          border-color: var(--card-border-hover);
        }
        .swagger-host .swagger-ui .opblock.is-open {
          border-color: rgba(58, 204, 184, 0.25);
        }
        .swagger-host .swagger-ui .opblock .opblock-summary {
          padding: 8px 14px;
          border-color: var(--border-subtle);
        }
        .swagger-host .swagger-ui .opblock .opblock-summary-method {
          background: rgba(58, 204, 184, 0.18) !important;
          color: var(--brand) !important;
          border-radius: 6px;
          min-width: 64px;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.04em;
          padding: 5px 8px;
          text-shadow: none;
          box-shadow: none;
        }
        .swagger-host .swagger-ui .opblock-summary-path,
        .swagger-host .swagger-ui .opblock-summary-path__deprecated,
        .swagger-host .swagger-ui .opblock-summary-path .nostyle span {
          color: var(--text-primary) !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          font-size: 13px;
          font-weight: 500;
        }
        .swagger-host .swagger-ui .opblock-summary-description {
          color: var(--text-secondary) !important;
          font-size: 12px;
        }
        .swagger-host .swagger-ui .opblock .opblock-section-header {
          background: var(--bg-card) !important;
          box-shadow: none;
          border-bottom: 1px solid var(--border-subtle);
        }
        .swagger-host .swagger-ui .opblock-description-wrapper p {
          color: var(--text-secondary) !important;
        }

        /* Tables (parameters / responses) */
        .swagger-host .swagger-ui .table-container,
        .swagger-host .swagger-ui table {
          background: transparent !important;
        }
        .swagger-host .swagger-ui table thead tr th,
        .swagger-host .swagger-ui table thead tr td {
          color: var(--text-tertiary) !important;
          font-weight: 500;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid var(--border-subtle) !important;
        }
        .swagger-host .swagger-ui table tbody tr td {
          color: var(--text-secondary) !important;
          border-bottom: 1px solid var(--border-subtle) !important;
        }
        .swagger-host .swagger-ui .parameter__name {
          color: var(--text-primary) !important;
          font-weight: 600;
          font-size: 13px;
        }
        .swagger-host .swagger-ui .parameter__name.required:after {
          color: var(--error) !important;
        }
        .swagger-host .swagger-ui .parameter__type,
        .swagger-host .swagger-ui .parameter__in,
        .swagger-host .swagger-ui .parameter__deprecated {
          color: var(--text-tertiary) !important;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
        }
        .swagger-host .swagger-ui .response-col_status {
          color: var(--text-primary) !important;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
        }
        .swagger-host .swagger-ui .response-col_description__inner div.markdown,
        .swagger-host .swagger-ui .response-col_description {
          color: var(--text-secondary) !important;
        }

        /* Buttons */
        .swagger-host .swagger-ui .btn {
          border-radius: 8px;
          font-family: inherit;
          font-weight: 500;
          font-size: 12.5px;
          height: 32px;
          padding: 0 12px;
          transition: all 150ms ease;
        }
        .swagger-host .swagger-ui .btn.execute {
          background: var(--brand) !important;
          color: #041512 !important;
          border: none;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15) inset,
            0 4px 14px -4px rgba(58, 204, 184, 0.5);
        }
        .swagger-host .swagger-ui .btn.execute:hover {
          filter: brightness(1.1);
        }
        .swagger-host .swagger-ui .btn.cancel {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--card-border);
        }
        .swagger-host .swagger-ui .btn.authorize {
          color: var(--brand) !important;
          border-color: rgba(58, 204, 184, 0.4) !important;
          background: rgba(58, 204, 184, 0.06) !important;
        }
        .swagger-host .swagger-ui .btn.authorize:hover {
          background: rgba(58, 204, 184, 0.1) !important;
        }
        .swagger-host .swagger-ui .btn.authorize svg {
          fill: var(--brand) !important;
        }
        .swagger-host .swagger-ui .btn.try-out__btn {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--card-border);
        }
        .swagger-host .swagger-ui .btn.try-out__btn:hover {
          color: var(--text-primary);
          border-color: var(--card-border-hover);
        }

        /* Inputs */
        .swagger-host .swagger-ui input[type="text"],
        .swagger-host .swagger-ui input[type="email"],
        .swagger-host .swagger-ui input[type="password"],
        .swagger-host .swagger-ui input[type="search"],
        .swagger-host .swagger-ui input[type="number"],
        .swagger-host .swagger-ui textarea,
        .swagger-host .swagger-ui select {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border-radius: 8px !important;
          border: 1px solid var(--card-border) !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          font-size: 12.5px !important;
          padding: 6px 10px !important;
          box-shadow: none !important;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .swagger-host .swagger-ui input[type="text"]:focus,
        .swagger-host .swagger-ui input[type="password"]:focus,
        .swagger-host .swagger-ui textarea:focus,
        .swagger-host .swagger-ui select:focus {
          outline: none !important;
          border-color: rgba(58, 204, 184, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(58, 204, 184, 0.18) !important;
        }

        /* Code blocks (response samples, curl preview) */
        .swagger-host .swagger-ui .highlight-code,
        .swagger-host .swagger-ui pre.microlight {
          background: #0A0B10 !important;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          padding: 12px !important;
        }
        .swagger-host .swagger-ui .highlight-code .microlight,
        .swagger-host .swagger-ui pre,
        .swagger-host .swagger-ui pre code,
        .swagger-host .swagger-ui pre.microlight code {
          color: var(--text-primary) !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          font-size: 12px !important;
          background: transparent !important;
        }

        /* Tabs (Try it / Example) */
        .swagger-host .swagger-ui .tab li {
          color: var(--text-tertiary) !important;
        }
        .swagger-host .swagger-ui .tab li.active,
        .swagger-host .swagger-ui .tab li.tabitem.active button {
          color: var(--text-primary) !important;
        }

        /* Models / Schemas section */
        .swagger-host .swagger-ui section.models {
          border-color: var(--card-border) !important;
          background: transparent !important;
          margin: 16px;
          border-radius: 12px;
        }
        .swagger-host .swagger-ui section.models h4,
        .swagger-host .swagger-ui section.models.is-open h4 {
          padding: 12px 16px;
          border-color: var(--border-subtle) !important;
        }
        .swagger-host .swagger-ui section.models h4 span,
        .swagger-host .swagger-ui section.models h4 button {
          color: var(--text-primary) !important;
          font-weight: 600;
          font-size: 14px;
        }
        .swagger-host .swagger-ui section.models .model-container {
          background: var(--bg-secondary) !important;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          margin: 8px 12px;
        }
        .swagger-host .swagger-ui .model,
        .swagger-host .swagger-ui .model-title,
        .swagger-host .swagger-ui .model-toggle,
        .swagger-host .swagger-ui .renderedMarkdown p {
          color: var(--text-primary) !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
        }
        .swagger-host .swagger-ui .model-toggle:after {
          background-color: var(--text-tertiary) !important;
        }
        .swagger-host .swagger-ui .property.primitive,
        .swagger-host .swagger-ui .prop-type {
          color: var(--brand) !important;
        }
        .swagger-host .swagger-ui .property-row .star {
          color: var(--error) !important;
        }

        /* Modal (auth dialog) */
        .swagger-host .swagger-ui .dialog-ux .modal-ux {
          background: var(--bg-card) !important;
          border: 1px solid var(--card-border) !important;
          border-radius: 16px !important;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(58, 204, 184, 0.06);
        }
        .swagger-host .swagger-ui .dialog-ux .modal-ux-header {
          border-bottom: 1px solid var(--border-subtle) !important;
          padding: 16px 20px !important;
        }
        .swagger-host .swagger-ui .dialog-ux .modal-ux-header h3 {
          color: var(--text-primary) !important;
          font-size: 15px;
          font-weight: 600;
        }
        .swagger-host .swagger-ui .dialog-ux .modal-ux-content {
          padding: 16px 20px !important;
        }
        .swagger-host .swagger-ui .dialog-ux .modal-ux-content p,
        .swagger-host .swagger-ui .dialog-ux .modal-ux-content code {
          color: var(--text-secondary) !important;
        }
        .swagger-host .swagger-ui .dialog-ux .modal-ux-content h4,
        .swagger-host .swagger-ui .dialog-ux label {
          color: var(--text-primary) !important;
        }
        .swagger-host .swagger-ui .dialog-ux .backdrop-ux {
          background: rgba(5, 7, 10, 0.7) !important;
          backdrop-filter: blur(6px);
        }
        .swagger-host .swagger-ui .auth-btn-wrapper .btn-done {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--card-border);
        }

        /* Hide legacy Swagger top bar / footer */
        .swagger-host .swagger-ui .topbar,
        .swagger-host .swagger-ui .info hgroup.main a {
          display: none !important;
        }

        /* Required / type pills */
        .swagger-host .swagger-ui .required {
          color: var(--error) !important;
          font-weight: 500;
        }
        .swagger-host .swagger-ui .markdown code,
        .swagger-host .swagger-ui .renderedMarkdown code {
          background: var(--bg-secondary) !important;
          color: var(--brand) !important;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11.5px;
        }

        /* Content type / response status badges */
        .swagger-host .swagger-ui .response-controls,
        .swagger-host .swagger-ui .response-control-media-type {
          color: var(--text-tertiary) !important;
        }

        /* Servers dropdown */
        .swagger-host .swagger-ui .servers-title {
          color: var(--text-secondary) !important;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .swagger-host .swagger-ui .servers > label select {
          margin-top: 4px;
        }

        /* Operation block borders */
        .swagger-host .swagger-ui .opblock.opblock-get {
          border-color: rgba(58, 204, 184, 0.15);
          background: rgba(58, 204, 184, 0.02) !important;
        }
        .swagger-host .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: var(--border-subtle);
        }

        /* Loading state for response */
        .swagger-host .swagger-ui .loading-container .loading:after {
          color: var(--brand) !important;
        }
      `}</style>
    </div>
  );
}
