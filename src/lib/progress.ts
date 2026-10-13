import { type Accessor, createEffect, createSignal, on } from "solid-js";
import { listProgress, type ProgressEntryResponse } from "~/client";
import { unwrap } from "./api";
import type { ProgressFilter } from "./filters";

export const PAGE_SIZE = 100;

/**
 * Newest-first progress history for a filter, loaded a page at a time. The list
 * starts over whenever the filter changes.
 */
export function createProgressPages(filter: Accessor<ProgressFilter>, pageSize = PAGE_SIZE) {
  const [entries, setEntries] = createSignal<ProgressEntryResponse[]>([]);
  const [nextCursor, setNextCursor] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<Error>();

  // A response for a filter that has since changed is dropped
  let generation = 0;

  async function load(cursor: number | null, append: boolean) {
    const current = ++generation;
    setLoading(true);
    setError(undefined);

    try {
      const page = await unwrap(
        listProgress({ query: { ...filter(), limit: pageSize, cursor: cursor ?? undefined } })
      );
      if (current !== generation) return;
      setEntries(prev => (append ? [...prev, ...page.entries] : page.entries));
      setNextCursor(page.next_cursor ?? null);
    } catch (e) {
      if (current !== generation) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (current === generation) setLoading(false);
    }
  }

  createEffect(
    on(filter, () => {
      setEntries([]);
      setNextCursor(null);
      void load(null, false);
    })
  );

  return {
    entries,
    loading,
    error,
    hasMore: () => nextCursor() !== null,
    loadMore: () => {
      const cursor = nextCursor();
      if (cursor !== null && !loading()) void load(cursor, true);
    },
    /** Starts over from the newest entry, keeping the current filter */
    refresh: () => void load(null, false)
  };
}
