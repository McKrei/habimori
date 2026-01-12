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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            {t("common.cancel", { lng })}
          </button>
          <button
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
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
