"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthButton from "@/src/components/AuthButton";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import ThemeSwitcher from "@/src/components/ThemeSwitcher";
import { DEFAULT_LANGUAGE } from "@/src/i18n";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function SettingsMenu() {
  const { t } = useTranslation();
  const {
    contexts,
    isLoading: contextsLoading,
    updateContext,
    deleteContext,
  } = useContexts();
  const { tags, isLoading: tagsLoading, updateTag, deleteTag } = useTags();
  const [isOpen, setIsOpen] = useState(false);
  const [contextsOpen, setContextsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editingContextName, setEditingContextName] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [deletingContextId, setDeletingContextId] = useState<string | null>(
    null,
  );
  const [workingContextId, setWorkingContextId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [workingTagId, setWorkingTagId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const resetMenuState = useCallback(() => {
    setEditingContextId(null);
    setEditingTagId(null);
    setDeletingContextId(null);
    setDeletingTagId(null);
    setContextError(null);
    setTagError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        resetMenuState();
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [isOpen, resetMenuState]);

  const contextNames = useMemo(
    () => contexts.map((context) => context.name.toLowerCase()),
    [contexts],
  );

  const tagNames = useMemo(
    () => tags.map((tag) => tag.name.toLowerCase()),
    [tags],
  );

  const startContextEdit = (id: string, name: string) => {
    setEditingContextId(id);
    setEditingContextName(name);
    setContextError(null);
    setDeletingContextId(null);
  };

  const startTagEdit = (id: string, name: string) => {
    setEditingTagId(id);
    setEditingTagName(name);
    setTagError(null);
    setDeletingTagId(null);
  };

  const handleContextSave = async () => {
    if (!editingContextId) return;
    const normalized = normalizeName(editingContextName);
    if (!normalized) {
      setContextError(t("errors.contextNameRequired"));
      return;
    }
    const existingIndex = contextNames.indexOf(normalized.toLowerCase());
    if (
      existingIndex !== -1 &&
      contexts[existingIndex] &&
      contexts[existingIndex].id !== editingContextId
    ) {
      setContextError(t("errors.contextNameExists"));
      return;
    }
    setWorkingContextId(editingContextId);
    const result = await updateContext(editingContextId, normalized);
    setWorkingContextId(null);
    if (result.error) {
      setContextError(t("errors.failedToUpdateContext"));
      return;
    }
    setEditingContextId(null);
    setEditingContextName("");
    setContextError(null);
  };

  const handleTagSave = async () => {
    if (!editingTagId) return;
    const normalized = normalizeName(editingTagName);
    if (!normalized) {
      setTagError(t("errors.tagNameRequired"));
      return;
    }
    const existingIndex = tagNames.indexOf(normalized.toLowerCase());
    if (
      existingIndex !== -1 &&
      tags[existingIndex] &&
      tags[existingIndex].id !== editingTagId
    ) {
      setTagError(t("errors.tagNameExists"));
      return;
    }
    setWorkingTagId(editingTagId);
    const result = await updateTag(editingTagId, normalized);
    setWorkingTagId(null);
    if (result.error) {
      setTagError(t("errors.failedToUpdateTag"));
      return;
    }
    setEditingTagId(null);
    setEditingTagName("");
    setTagError(null);
  };

  const handleContextDelete = async (contextId: string) => {
    setWorkingContextId(contextId);
    const result = await deleteContext(contextId);
    setWorkingContextId(null);
    if (result.error) {
      setContextError(t("errors.failedToDeleteContext"));
      return;
    }
    setDeletingContextId(null);
    setContextError(null);
  };

  const handleTagDelete = async (tagId: string) => {
    setWorkingTagId(tagId);
    const result = await deleteTag(tagId);
    setWorkingTagId(null);
    if (result.error) {
      setTagError(t("errors.failedToDeleteTag"));
      return;
    }
    setDeletingTagId(null);
    setTagError(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-surface hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
        onClick={() =>
          setIsOpen((prev) => {
            if (prev) {
              resetMenuState();
            }
            return !prev;
          })
        }
        aria-label={t("settings.open")}
        title={t("settings.open")}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.99a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.99 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8.99a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[22rem] rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              {t("settings.title")}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher lng={DEFAULT_LANGUAGE} />
            <AuthButton />
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border-light bg-surface-elevated/60">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
                onClick={() => setContextsOpen((prev) => !prev)}
              >
                <span>{t("settings.manageContexts")}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${contextsOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {contextsOpen ? (
                <div className="space-y-2 border-t border-border-light px-3 py-3">
                  {contextsLoading ? (
                    <p className="text-xs text-text-muted">
                      {t("common.loading")}
                    </p>
                  ) : contexts.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      {t("settings.noContexts")}
                    </p>
                  ) : (
                    contexts.map((context) => {
                      const isEditing = editingContextId === context.id;
                      const isDeleting = deletingContextId === context.id;
                      const isWorking = workingContextId === context.id;
                      return (
                        <div key={context.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm">
                            {isEditing ? (
                              <input
                                value={editingContextName}
                                onChange={(event) =>
                                  setEditingContextName(event.target.value)
                                }
                                className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                              />
                            ) : (
                              <span className="truncate text-text-primary">
                                {context.name}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-surface hover:bg-accent-hover disabled:opacity-60"
                                    onClick={handleContextSave}
                                    disabled={isWorking}
                                  >
                                    {t("common.save")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                    onClick={() => {
                                      setEditingContextId(null);
                                      setEditingContextName("");
                                      setContextError(null);
                                    }}
                                    disabled={isWorking}
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                    onClick={() =>
                                      startContextEdit(context.id, context.name)
                                    }
                                  >
                                    {t("common.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10"
                                    onClick={() => {
                                      setDeletingContextId(context.id);
                                      setEditingContextId(null);
                                      setContextError(null);
                                    }}
                                  >
                                    {t("common.delete")}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {isDeleting ? (
                            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                              <p className="font-medium text-rose-700">
                                {t("settings.deleteContextWarning")}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-surface hover:bg-rose-500 disabled:opacity-60"
                                  onClick={() =>
                                    handleContextDelete(context.id)
                                  }
                                  disabled={isWorking}
                                >
                                  {t("common.delete")}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                  onClick={() => setDeletingContextId(null)}
                                  disabled={isWorking}
                                >
                                  {t("common.cancel")}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                  {contextError ? (
                    <p className="text-xs text-rose-600">{contextError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border-light bg-surface-elevated/60">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
                onClick={() => setTagsOpen((prev) => !prev)}
              >
                <span>{t("settings.manageTags")}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${tagsOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {tagsOpen ? (
                <div className="space-y-2 border-t border-border-light px-3 py-3">
                  {tagsLoading ? (
                    <p className="text-xs text-text-muted">
                      {t("common.loading")}
                    </p>
                  ) : tags.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      {t("settings.noTags")}
                    </p>
                  ) : (
                    tags.map((tag) => {
                      const isEditing = editingTagId === tag.id;
                      const isDeleting = deletingTagId === tag.id;
                      const isWorking = workingTagId === tag.id;
                      return (
                        <div key={tag.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm">
                            {isEditing ? (
                              <input
                                value={editingTagName}
                                onChange={(event) =>
                                  setEditingTagName(event.target.value)
                                }
                                className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                              />
                            ) : (
                              <span className="truncate text-text-primary">
                                {tag.name}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-surface hover:bg-accent-hover disabled:opacity-60"
                                    onClick={handleTagSave}
                                    disabled={isWorking}
                                  >
                                    {t("common.save")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                    onClick={() => {
                                      setEditingTagId(null);
                                      setEditingTagName("");
                                      setTagError(null);
                                    }}
                                    disabled={isWorking}
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                    onClick={() =>
                                      startTagEdit(tag.id, tag.name)
                                    }
                                  >
                                    {t("common.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10"
                                    onClick={() => {
                                      setDeletingTagId(tag.id);
                                      setEditingTagId(null);
                                      setTagError(null);
                                    }}
                                  >
                                    {t("common.delete")}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {isDeleting ? (
                            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                              <p className="font-medium text-rose-700">
                                {t("settings.deleteTagWarning")}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-surface hover:bg-rose-500 disabled:opacity-60"
                                  onClick={() => handleTagDelete(tag.id)}
                                  disabled={isWorking}
                                >
                                  {t("common.delete")}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
                                  onClick={() => setDeletingTagId(null)}
                                  disabled={isWorking}
                                >
                                  {t("common.cancel")}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                  {tagError ? (
                    <p className="text-xs text-rose-600">{tagError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
