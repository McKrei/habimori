"use client";

import { useTranslation } from "@/src/i18n/TranslationContext";
import { TagOption } from "./types";

interface TagsOverflowModalProps {
  tags: TagOption[];
  onClose: () => void;
  lng: string;
}

export function TagsOverflowModal({ tags, onClose, lng }: TagsOverflowModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {t("tags.tags", { lng })}
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500">{t("timeLogs.noTagsToShow", { lng })}</p>
          ) : (
            tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
              >
                {tag.name}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
