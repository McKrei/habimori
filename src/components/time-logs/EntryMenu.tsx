"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/src/i18n/TranslationContext";

interface EntryMenuProps {
  onDelete: () => void;
  onEditTags: () => void;
  disabled?: boolean;
}

export function EntryMenu({ onDelete, onEditTags, disabled }: EntryMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  const handleEditTags = () => {
    setIsOpen(false);
    onEditTags();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full text-text-faint transition hover:bg-surface-elevated hover:text-text-secondary disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={t("timeLogs.entryMenu")}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 rounded-xl border border-border/70 bg-surface p-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-background"
            onClick={handleEditTags}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            {t("timeLogs.editTags")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-500/10"
            onClick={handleDelete}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {t("common.delete")}
          </button>
        </div>
      )}
    </div>
  );
}
