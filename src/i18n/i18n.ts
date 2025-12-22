// src/i18n/i18n.ts
import en from "./en.json";
import de from "./de.json";

export type SupportedLanguage = "en" | "de";

const resources: Record<SupportedLanguage, any> = {
  en,
  de,
};

export function getDefaultLanguage(): SupportedLanguage {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("app_language");
    if (stored === "en" || stored === "de") return stored as SupportedLanguage;

    const browser = window.navigator.language.toLowerCase();
    if (browser.startsWith("de")) return "de";
  }

  const env = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;
  if (env === "de") return "de";
  return "en";
}

export function translate(lang: SupportedLanguage, key: string): string {
  const parts = key.split(".");
  let value: any = resources[lang];

  for (const p of parts) {
    if (value == null || typeof value !== "object") return key;
    value = value[p];
  }

  if (typeof value !== "string") return key;
  return value;
}
