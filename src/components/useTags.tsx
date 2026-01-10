"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";

export type TagOption = {
  id: string;
  name: string;
};

type EnsureTagResult = {
  tag: TagOption | null;
  error: string | null;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function useTags() {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from("tags")
      .select("id, name")
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setTags([]);
    } else {
      setError(null);
      setTags(data ?? []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const ensureTag = useCallback(
    async (name: string): Promise<EnsureTagResult> => {
      const normalized = normalizeName(name);

      if (!normalized) {
        return { tag: null, error: "Tag name is required." };
      }

      const { userId, error: userError } = await getCurrentUserId();
      if (userError) {
        return { tag: null, error: userError };
      }
      if (!userId) {
        return { tag: null, error: "Please log in to create a tag." };
      }

      const existing = tags.find(
        (tag) => tag.name.toLowerCase() === normalized.toLowerCase(),
      );

      if (existing) {
        return { tag: existing, error: null };
      }

      const { data, error: insertError } = await supabase
        .from("tags")
        .insert({ name: normalized, user_id: userId })
        .select("id, name")
        .single();

      if (!insertError && data) {
        setTags((prev) =>
          [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
        );
        return { tag: data, error: null };
      }

      const { data: fallback } = await supabase
        .from("tags")
        .select("id, name")
        .ilike("name", normalized)
        .maybeSingle();

      if (fallback) {
        setTags((prev) => {
          if (prev.some((tag) => tag.id === fallback.id)) {
            return prev;
          }
          return [...prev, fallback].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
        return { tag: fallback, error: null };
      }

      return {
        tag: null,
        error: insertError?.message ?? "Failed to create tag.",
      };
    },
    [tags],
  );

  return {
    tags,
    isLoading,
    error,
    refresh,
    ensureTag,
  };
}
