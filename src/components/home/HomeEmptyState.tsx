"use client";

import Link from "next/link";
import { useTranslation } from "@/src/i18n/TranslationContext";

type HomeEmptyStateProps = {
  lng: string;
};

export default function HomeEmptyState({ lng: _lng }: HomeEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{t("home.noActiveGoals")}</p>
      <Link
        className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
        href="/goals/new"
      >
        {t("home.createFirstGoal")}
      </Link>
    </div>
  );
}
