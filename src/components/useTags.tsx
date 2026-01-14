"use client";

import { useCallback } from "react";
import {
  useAppStore,
  useAppTags as useStoreTags,
  useStoreStatus,
  ensureTag as storeEnsureTag,
  updateTag as storeUpdateTag,
  deleteTag as storeDeleteTag
} from "@/src/store";

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

export function useTags() {
  const store = useAppStore();
  const { tags } = useStoreTags();
  const { isLoading, loadError } = useStoreStatus();

  const refresh = useCallback(async () => {
    // No-op: Data is managed by the centralized store
  }, []);

  const ensureTag = useCallback(
    async (name: string): Promise<EnsureTagResult> => {
      const result = await storeEnsureTag(store, name);
      return result;
    },
    [store]
  );

  const updateTag = useCallback(
    async (tagId: string, name: string): Promise<UpdateTagResult> => {
      const result = await storeUpdateTag(store, tagId, name);
      return result;
    },
    [store]
  );

  const deleteTag = useCallback(
    async (tagId: string): Promise<DeleteTagResult> => {
      const result = await storeDeleteTag(store, tagId);
      return result;
    },
    [store]
  );

  return {
    tags,
    isLoading,
    error: loadError,
    refresh,
    ensureTag,
    updateTag,
    deleteTag,
  };
}
