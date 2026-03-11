"use client";

import * as React from "react";
import { useI18n, locales, localeFlagImages, localeNames, Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-bg-card border border-border hover:border-text-tertiary transition-all duration-200"
        aria-label="Select language"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={localeFlagImages[locale]}
          alt={localeNames[locale]}
          width={20}
          height={15}
          className="rounded-sm"
        />
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-secondary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-40 rounded-md bg-bg-card border border-border shadow-lg overflow-hidden z-50 animate-fade-in">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleSelect(loc)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-200",
                loc === locale
                  ? "bg-brand-subtle text-brand"
                  : "text-text-primary hover:bg-bg-secondary"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={localeFlagImages[loc]}
                alt={localeNames[loc]}
                width={20}
                height={15}
                className="rounded-sm"
              />
              <span className="font-medium">{localeNames[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
