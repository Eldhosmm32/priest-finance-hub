// src/i18n/LanguageContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getDefaultLanguage, translate, SupportedLanguage } from "./i18n";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../hooks/useUser";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [initializedFromProfile, setInitializedFromProfile] = useState(false);
  const { user } = useUser();

  // Initial language from localStorage / browser / env
  useEffect(() => {
    setLanguageState(getDefaultLanguage());
  }, []);

  useEffect(() => {
    if (!user || initializedFromProfile) return;

    const loadPreferred = async () => {
      // If the user has already explicitly chosen a language on this client
      // (stored in localStorage), prefer that and do not overwrite it with
      // the value from the profile. This preserves an explicit selection
      // across refreshes even if the profile has a different value.
      let stored: SupportedLanguage | null = null;
      if (typeof window !== "undefined") {
        const v = window.localStorage.getItem("app_language");
        if (v === "en" || v === "de") stored = v as SupportedLanguage;
      }

      if (stored) {
        // mark as initialized so we don't re-run this profile fetch
        setInitializedFromProfile(true);
        return;
      }

      setInitializedFromProfile(true);
    };

    loadPreferred();
  }, [user, initializedFromProfile]);

  // Keep the <html lang> attribute in sync with the selected language
  useEffect(() => {
    if (typeof window !== "undefined" && document?.documentElement) {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("app_language", lang);
    }
  };

  const t = (key: string) => translate(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}
