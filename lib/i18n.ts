import { createContext, useContext } from "react";

export type Locale = "en" | "es";

export const locales: Locale[] = ["en", "es"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export const localeFlagImages: Record<Locale, string> = {
  en: "/flags/gb.svg",
  es: "/flags/es.svg",
};

// Default locale
export const defaultLocale: Locale = "en";

// Context for locale
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  messages: Record<string, unknown>;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Helper to get nested value from object
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if not found
    }
  }

  return typeof current === "string" ? current : path;
}

// Get stored locale from localStorage
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  const stored = localStorage.getItem("locale");
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Try to detect from browser
  const browserLang = navigator.language.split("-")[0];
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return defaultLocale;
}

// Store locale in localStorage
export function storeLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("locale", locale);
}
