"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface InlineDatePickerProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function InlineDatePicker({ value, onSave, onCancel }: InlineDatePickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    (inputRef.current as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
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
        className="rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        type="date"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
}
