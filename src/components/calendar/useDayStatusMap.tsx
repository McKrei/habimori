"use client";

import { useDayStatusMapFromStore } from "@/src/store";

export type DayStatusCounts = {
  success: number;
  in_progress: number;
  fail: number;
};

/** @deprecated Use DayStatusCounts instead */
export type DayStatusPresence = {
  success: boolean;
  in_progress: boolean;
  fail: boolean;
};

/**
 * Hook to get status counts for multiple days.
 * Uses AppStore for data - no additional network requests.
 */
export function useDayStatusMap(days: Date[]) {
  const { statusMap, isLoading } = useDayStatusMapFromStore(days);

  return {
    statusMap,
    isLoading,
    error: null as string | null,
  };
}
