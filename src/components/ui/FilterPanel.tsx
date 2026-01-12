"use client";

import { useEffect, useRef, ReactNode } from "react";
import CloseIcon from "@/src/components/icons/CloseIcon";
import { useTranslation } from "@/src/i18n/TranslationContext";

type FilterPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  children: ReactNode;
  hasActiveFilters: boolean;
};

export default function FilterPanel({
  isOpen,
  onClose,
  onReset,
  children,
  hasActiveFilters,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className="
            w-full max-w-sm rounded-2xl bg-white shadow-xl
            animate-in zoom-in-95 duration-200
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {t("filters.title")}
            </h2>
            <button
              onClick={onClose}
              className="
                flex h-8 w-8 items-center justify-center rounded-lg
                text-slate-400 transition-colors
                hover:bg-slate-100 hover:text-slate-600
              "
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex gap-2">
              {hasActiveFilters && (
                <button
                  onClick={onReset}
                  className="
                    flex-1 rounded-lg border border-slate-200 px-3 py-2
                    text-xs font-medium text-slate-600
                    transition-colors hover:bg-slate-50
                  "
                >
                  {t("filters.reset")}
                </button>
              )}
              <button
                onClick={onClose}
                className="
                  flex-1 rounded-lg bg-slate-900 px-3 py-2
                  text-xs font-medium text-white
                  transition-colors hover:bg-slate-800
                "
              >
                {t("filters.apply")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
