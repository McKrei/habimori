"use client";

import Link from "next/link";
import { useTranslation } from "@/src/i18n/TranslationContext";

type HomeEmptyStateProps = {
  lng: string;
};

export default function HomeEmptyState({ lng: _lng }: HomeEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center transition-colors">
      <p className="text-sm text-text-secondary">{t("home.noActiveGoals")}</p>
      <Link
        className="mt-4 inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:border-text-faint hover:text-text-primary transition-colors"
        href="/goals/new"
      >
        {t("home.createFirstGoal")}
      </Link>
    </div>
  );
}
