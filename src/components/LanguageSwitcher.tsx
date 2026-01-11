"use client";

import { useTranslation } from "@/src/i18n/TranslationContext";
import type { Language } from "@/src/i18n/config";

type LanguageSwitcherProps = {
  lng: string;
};

export default function LanguageSwitcher({ lng: _lng }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();

  const otherLanguage: Language = language === "ru" ? "en" : "ru";
  const label = language === "ru" ? "Switch to English" : "Переключиться на русский";

  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={() => setLanguage(otherLanguage)}
      title={label}
      aria-label={label}
      type="button"
    >
      <span className="text-xs font-semibold">{otherLanguage.toUpperCase()}</span>
    </button>
  );
}
