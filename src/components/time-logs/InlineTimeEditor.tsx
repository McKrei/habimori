"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface InlineTimeEditorProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function InlineTimeEditor({ value, onSave, onCancel }: InlineTimeEditorProps) {
  const [inputValue, setInputValue] = useState(value.replace(":", ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setInputValue(raw);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const formatted = formatTime(inputValue);
      if (formatted) {
        onSave(formatted);
      } else {
        onCancel();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }, [inputValue, onSave, onCancel]);

  const handleBlur = useCallback(() => {
    const formatted = formatTime(inputValue);
    if (formatted) {
      onSave(formatted);
    } else {
      onCancel();
    }
  }, [inputValue, onSave, onCancel]);

  const displayValue = inputValue.length > 2 
    ? `${inputValue.slice(0, 2)}:${inputValue.slice(2)}` 
    : inputValue;

  return (
    <div className="inline-flex items-center">
      <input
        ref={inputRef}
        className="w-16 rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        maxLength={5}
        placeholder="HH:MM"
      />
    </div>
  );
}

function formatTime(raw: string): string | null {
  if (raw.length < 4) return null;
  const hours = parseInt(raw.slice(0, 2), 10);
  const minutes = parseInt(raw.slice(2, 4), 10);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
