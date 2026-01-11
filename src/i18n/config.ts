export type Language = "ru" | "en";

export const SUPPORTED_LANGUAGES: Language[] = ["ru", "en"];

export const LANGUAGE_NAMES: Record<Language, string> = {
  ru: "Русский",
  en: "English",
};

export const LANGUAGE_CODES: Record<Language, string> = {
  ru: "ru-RU",
  en: "en-US",
};

export const DEFAULT_LANGUAGE: Language = "ru";

export const FALLBACK_LANGUAGE: Language = "en";

export function isLanguage(value: string): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

export function getLanguageFromBrowser(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const browserLang = navigator.language.split("-")[0];
  return isLanguage(browserLang) ? browserLang : DEFAULT_LANGUAGE;
}

export function getLanguageFromStorage(): Language | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("user-language");
  return stored && isLanguage(stored) ? stored : null;
}

export function setLanguageStorage(language: Language): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("user-language", language);
  }
}
