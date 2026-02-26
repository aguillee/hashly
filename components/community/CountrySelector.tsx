"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { countries } from "@/lib/countries";

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = countries.find((c) => c.code === value);

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary text-left text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
      >
        {selected ? (
          <span>
            {selected.emoji} {selected.name}
          </span>
        ) : (
          <span className="text-text-secondary">Select a country...</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-bg-card shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-secondary">
                No countries found
              </p>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-secondary transition-colors flex items-center gap-2 ${
                    value === country.code
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-text-primary"
                  }`}
                >
                  <span>{country.emoji}</span>
                  <span>{country.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
