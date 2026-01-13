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

type UpdateTagResult = {
  tag: TagOption | null;
  error: string | null;
};

type DeleteTagResult = {
  error: string | null;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const TAGS_UPDATED_EVENT = "habimori-tags-updated";

export function useTags() {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notifyUpdated = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(TAGS_UPDATED_EVENT));
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void refresh();
    };
    window.addEventListener(TAGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TAGS_UPDATED_EVENT, handler);
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

  const updateTag = useCallback(
    async (tagId: string, name: string): Promise<UpdateTagResult> => {
      const normalized = normalizeName(name);
      if (!normalized) {
        return { tag: null, error: "Tag name is required." };
      }

      const { data, error: updateError } = await supabase
        .from("tags")
        .update({ name: normalized })
        .eq("id", tagId)
        .select("id, name")
        .single();

      if (updateError || !data) {
        return {
          tag: null,
          error: updateError?.message ?? "Failed to update tag.",
        };
      }

      setTags((prev) =>
        prev
          .map((tag) => (tag.id === tagId ? data : tag))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      notifyUpdated();
      return { tag: data, error: null };
    },
    [notifyUpdated],
  );

  const deleteTag = useCallback(
    async (tagId: string): Promise<DeleteTagResult> => {
      const { error: timeEntryError } = await supabase
        .from("time_entry_tags")
        .delete()
        .eq("tag_id", tagId);
      if (timeEntryError) {
        return { error: timeEntryError.message };
      }

      const { error: goalTagError } = await supabase
        .from("goal_tags")
        .delete()
        .eq("tag_id", tagId);
      if (goalTagError) {
        return { error: goalTagError.message };
      }

      const { error: counterError } = await supabase
        .from("counter_event_tags")
        .delete()
        .eq("tag_id", tagId);
      if (counterError) {
        return { error: counterError.message };
      }

      const { error: checkError } = await supabase
        .from("check_event_tags")
        .delete()
        .eq("tag_id", tagId);
      if (checkError) {
        return { error: checkError.message };
      }

      const { error: tagError } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      if (tagError) {
        return { error: tagError.message };
      }

      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      notifyUpdated();
      return { error: null };
    },
    [notifyUpdated],
  );

  return {
    tags,
    isLoading,
    error,
    refresh,
    ensureTag,
    updateTag,
    deleteTag,
  };
}
