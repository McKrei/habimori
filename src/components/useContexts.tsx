"use client";

import { useCallback } from "react";
import {
  useAppStore,
  useAppContexts as useStoreContexts,
  useStoreStatus,
  ensureContext as storeEnsureContext,
  updateContext as storeUpdateContext,
  deleteContext as storeDeleteContext
} from "@/src/store";

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

export function useContexts() {
  const store = useAppStore();
  const { contexts } = useStoreContexts();
  const { isLoading, loadError } = useStoreStatus();

  const refresh = useCallback(async () => {
    // No-op: Data is managed by the centralized store
  }, []);

  const ensureContext = useCallback(
    async (name: string): Promise<EnsureContextResult> => {
      const result = await storeEnsureContext(store, name);
      return result;
    },
    [store]
  );

  const updateContext = useCallback(
    async (contextId: string, name: string): Promise<UpdateContextResult> => {
      const result = await storeUpdateContext(store, contextId, name);
      return result;
    },
    [store]
  );

  const deleteContext = useCallback(
    async (contextId: string): Promise<DeleteContextResult> => {
      const result = await storeDeleteContext(store, contextId);
      return result;
    },
    [store]
  );

  return {
    contexts,
    isLoading,
    error: loadError,
    refresh,
    ensureContext,
    updateContext,
    deleteContext,
  };
}
