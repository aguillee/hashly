"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-dashed border-border/50 bg-bg-card/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-primary">Hashly</span>
            <span className="text-text-secondary text-xs">
              · Discover Events on Hedera
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/hashly_h"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-secondary/80 transition-colors text-xs"
              aria-label="Follow Hashly on X"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @hashly_h
            </a>
          </div>

          {/* Copyright */}
          <div className="text-text-secondary/60 text-xs font-mono">
            © {new Date().getFullYear()}
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mt-4 pt-3 border-t border-dashed border-border/30 text-center">
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider">
            Beta version · May contain errors
          </p>
        </div>
      </div>
    </footer>
  );
}
