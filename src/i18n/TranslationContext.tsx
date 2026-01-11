"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase/client";
import type { Language } from "./config";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromBrowser,
  getLanguageFromStorage,
  setLanguageStorage,
} from "./config";

import ru from "./locales/ru.json";
import en from "./locales/en.json";

type Translations = typeof ru;

const TRANSLATIONS: Record<Language, Translations> = {
  ru,
  en,
};

type TranslationContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunction;
  translations: Translations;
};

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & string];

export type TFunction = {
  <Key extends NestedKeyOf<Translations>>(
    key: Key,
    params?: Record<string, string | number>
  ): string;
};

function getNestedValue(obj: object, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function interpolate(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

const TranslationContext = createContext<TranslationContextType | null>(null);

async function updateUserLanguage(lang: Language) {
  const { error } = await supabase
    .from("users")
    .update({ language: lang })
    .select();
  if (error) {
    console.error("Failed to update user language:", error);
  }
}

async function fetchUserLanguage(): Promise<Language | null> {
  const { data, error } = await supabase
    .from("users")
    .select("language")
    .single();
  if (error || !data?.language) {
    return null;
  }
  return data.language as Language;
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Translations>(TRANSLATIONS[DEFAULT_LANGUAGE]);
  const [isInitialized, setIsInitialized] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setTranslations(TRANSLATIONS[lang]);
    setLanguageStorage(lang);
    void updateUserLanguage(lang);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      let initialLang = getLanguageFromStorage() || getLanguageFromBrowser();
      if (DEFAULT_LANGUAGE && !TRANSLATIONS[initialLang]) {
        initialLang = DEFAULT_LANGUAGE;
      }
      const userLang = await fetchUserLanguage();
      if (userLang && TRANSLATIONS[userLang]) {
        initialLang = userLang;
      }
      setLanguageState(initialLang);
      setTranslations(TRANSLATIONS[initialLang]);
      setIsInitialized(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const t = useCallback<TFunction>(
    (key, params) => interpolate(getNestedValue(translations, key) as string || key, params),
    [translations]
  );

  const value: TranslationContextType = {
    language,
    setLanguage,
    t,
    translations,
  };

  if (!isInitialized) {
    return (
      <TranslationContext.Provider value={value}>
            {children}
      </TranslationContext.Provider>
    );
  }

  return (
    <TranslationContext.Provider value={value}>
      <div lang={language} dir="ltr">
        {children}
      </div>
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}

export { TRANSLATIONS };
export type { Translations };
