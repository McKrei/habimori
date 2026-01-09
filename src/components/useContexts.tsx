"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";

export type ContextOption = {
  id: string;
  name: string;
};

type EnsureContextResult = {
  context: ContextOption | null;
  error: string | null;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function useContexts() {
  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from("contexts")
      .select("id, name")
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setContexts([]);
    } else {
      setError(null);
      setContexts(data ?? []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureContext = useCallback(
    async (name: string): Promise<EnsureContextResult> => {
      const normalized = normalizeName(name);

      if (!normalized) {
        return { context: null, error: "Context name is required." };
      }

      const { userId, error: userError } = await getCurrentUserId();
      if (userError) {
        return { context: null, error: userError };
      }
      if (!userId) {
        return { context: null, error: "Please log in to create a context." };
      }

      const existing = contexts.find(
        (context) => context.name.toLowerCase() === normalized.toLowerCase(),
      );

      if (existing) {
        return { context: existing, error: null };
      }

      const { data, error: insertError } = await supabase
        .from("contexts")
        .insert({ name: normalized, user_id: userId })
        .select("id, name")
        .single();

      if (!insertError && data) {
        setContexts((prev) =>
          [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
        );
        return { context: data, error: null };
      }

      const { data: fallback } = await supabase
        .from("contexts")
        .select("id, name")
        .ilike("name", normalized)
        .maybeSingle();

      if (fallback) {
        setContexts((prev) => {
          if (prev.some((context) => context.id === fallback.id)) {
            return prev;
          }
          return [...prev, fallback].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
        return { context: fallback, error: null };
      }

      return {
        context: null,
        error: insertError?.message ?? "Failed to create context.",
      };
    },
    [contexts],
  );

  return {
    contexts,
    isLoading,
    error,
    refresh,
    ensureContext,
  };
}
