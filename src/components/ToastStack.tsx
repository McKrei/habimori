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
          className={`rounded-md border px-4 py-2 text-sm shadow-sm ${
            toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
