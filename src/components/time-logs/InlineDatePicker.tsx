"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface InlineDatePickerProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function InlineDatePicker({ value, onSave, onCancel }: InlineDatePickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    input?.focus();
    input?.showPicker?.();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave(inputValue);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }, [inputValue, onSave, onCancel]);

  const handleBlur = useCallback(() => {
    onSave(inputValue);
  }, [inputValue, onSave]);

  return (
    <div className="inline-flex items-center">
      <input
        ref={inputRef}
        className="rounded-xl border border-border/70 bg-surface px-2 py-1 text-sm font-medium text-text-secondary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        type="date"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
}
