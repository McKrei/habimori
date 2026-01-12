"use client";

import { useTranslation } from "@/src/i18n/TranslationContext";

interface DeleteConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lng: string;
}

export function DeleteConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  lng,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent/30">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
            onClick={onCancel}
            type="button"
          >
            {t("common.cancel", { lng })}
          </button>
          <button
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-surface hover:bg-rose-600"
            onClick={onConfirm}
            type="button"
          >
            {t("common.delete", { lng })}
          </button>
        </div>
      </div>
    </div>
  );
}
