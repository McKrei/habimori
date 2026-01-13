"use client";

import { useEffect } from "react";

export type Toast = {
  id: string;
  message: string;
  tone?: "error" | "info";
};

type ToastStackProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss(toast.id), 4000),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md border px-4 py-2 text-sm shadow-sm transition-colors ${
            toast.tone === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
              : "border-border bg-surface text-text-secondary"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
