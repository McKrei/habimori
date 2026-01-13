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

type UpdateContextResult = {
  context: ContextOption | null;
  error: string | null;
};

type DeleteContextResult = {
  error: string | null;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const CONTEXTS_UPDATED_EVENT = "habimori-contexts-updated";

export function useContexts() {
  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notifyUpdated = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(CONTEXTS_UPDATED_EVENT));
  }, []);

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
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void refresh();
    };
    window.addEventListener(CONTEXTS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CONTEXTS_UPDATED_EVENT, handler);
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

  const updateContext = useCallback(
    async (contextId: string, name: string): Promise<UpdateContextResult> => {
      const normalized = normalizeName(name);
      if (!normalized) {
        return { context: null, error: "Context name is required." };
      }

      const { data, error: updateError } = await supabase
        .from("contexts")
        .update({ name: normalized })
        .eq("id", contextId)
        .select("id, name")
        .single();

      if (updateError || !data) {
        return {
          context: null,
          error: updateError?.message ?? "Failed to update context.",
        };
      }

      setContexts((prev) =>
        prev
          .map((context) => (context.id === contextId ? data : context))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      notifyUpdated();
      return { context: data, error: null };
    },
    [notifyUpdated],
  );

  const deleteContext = useCallback(
    async (contextId: string): Promise<DeleteContextResult> => {
      const { error: timeEntryError } = await supabase
        .from("time_entries")
        .delete()
        .eq("context_id", contextId);
      if (timeEntryError) {
        return { error: timeEntryError.message };
      }

      const { error: counterError } = await supabase
        .from("counter_events")
        .delete()
        .eq("context_id", contextId);
      if (counterError) {
        return { error: counterError.message };
      }

      const { error: checkError } = await supabase
        .from("check_events")
        .delete()
        .eq("context_id", contextId);
      if (checkError) {
        return { error: checkError.message };
      }

      const { error: goalsError } = await supabase
        .from("goals")
        .delete()
        .eq("context_id", contextId);
      if (goalsError) {
        return { error: goalsError.message };
      }

      const { error: contextError } = await supabase
        .from("contexts")
        .delete()
        .eq("id", contextId);
      if (contextError) {
        return { error: contextError.message };
      }

      setContexts((prev) => prev.filter((context) => context.id !== contextId));
      notifyUpdated();
      return { error: null };
    },
    [notifyUpdated],
  );

  return {
    contexts,
    isLoading,
    error,
    refresh,
    ensureContext,
    updateContext,
    deleteContext,
  };
}
