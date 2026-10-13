import { Match, Show, Switch } from "solid-js";
import type { createProgressPages } from "~/lib/progress";
import { EmptyState, ErrorAlert, Loading } from "./Feedback";
import ProgressTable from "./ProgressTable";

export type ProgressPages = ReturnType<typeof createProgressPages>;

/** Paged progress history with its loading, error and empty states */
export default function ProgressFeed(props: { pages: ProgressPages; showUser?: boolean; filtered?: boolean }) {
  return (
    <div class="space-y-3">
      <Show when={props.pages.error()}>
        {error => <ErrorAlert error={error()} onRetry={props.pages.refresh} />}
      </Show>

      <Switch>
        <Match when={props.pages.entries().length > 0}>
          <div class="card bg-base-100 border-base-300 border">
            <ProgressTable entries={props.pages.entries()} showUser={props.showUser} />
          </div>
          <div class="flex flex-col items-center gap-2">
            <p class="text-base-content/60 text-sm">
              {props.pages.entries().length} {props.pages.entries().length === 1 ? "entry" : "entries"} loaded
            </p>
            <Show when={props.pages.hasMore()}>
              <button type="button" class="btn" disabled={props.pages.loading()} onClick={props.pages.loadMore}>
                <Show when={props.pages.loading()}>
                  <span class="loading loading-spinner loading-sm" />
                </Show>
                Load more
              </button>
            </Show>
          </div>
        </Match>
        <Match when={props.pages.loading()}>
          <Loading />
        </Match>
        <Match when={!props.pages.error()}>
          <EmptyState title={props.filtered ? "Nothing matches these filters" : "No progress recorded yet"}>
            {props.filtered
              ? "Widen the time range or clear a filter."
              : "Entries appear here once a KOReader client pushes progress."}
          </EmptyState>
        </Match>
      </Switch>
    </div>
  );
}
