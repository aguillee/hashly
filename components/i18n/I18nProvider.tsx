"use client";

import * as React from "react";
import {
  I18nContext,
  Locale,
  getStoredLocale,
  storeLocale,
  getNestedValue,
  defaultLocale,
} from "@/lib/i18n";

// Import messages
import en from "@/messages/en.json";
import es from "@/messages/es.json";

const messages: Record<Locale, Record<string, unknown>> = {
  en,
  es,
};

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(defaultLocale);
  const [isMounted, setIsMounted] = React.useState(false);

  // Load locale from localStorage on mount (client-side only)
  React.useEffect(() => {
    setIsMounted(true);
    try {
      const stored = getStoredLocale();
      if (stored !== locale) {
        setLocaleState(stored);
      }
    } catch {
      // Ignore errors during SSR/SSG
    }
  }, []);

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
  }, []);

  const t = React.useCallback(
    (key: string): string => {
      return getNestedValue(messages[locale], key);
    },
    [locale]
  );

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages: messages[locale],
    }),
    [locale, setLocale, t]
  );

  // Always render with the current locale value
  // The useEffect will update it on the client if needed

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
