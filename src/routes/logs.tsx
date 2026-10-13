import { useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from "solid-js";
import type { LogEntry, LogLevel } from "~/client";
import Icon from "~/components/Icon";
import PageHeader from "~/components/PageHeader";
import { formatClock } from "~/lib/format";
import { logStore, MAX_LOG_ITEMS } from "~/lib/logs";

const LEVELS: LogLevel[] = ["error", "warn", "info", "debug", "trace"];

const LEVEL_BUTTON: Record<LogLevel, string> = {
  error: "btn-error",
  warn: "btn-warning",
  info: "btn-info",
  debug: "btn-neutral",
  trace: "btn-soft"
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  error: "badge-error",
  warn: "badge-warning",
  info: "badge-info",
  debug: "badge-neutral",
  trace: "badge-ghost"
};

const STATUS_LABEL = { connecting: "Connecting", live: "Live", reconnecting: "Reconnecting" } as const;

/** How close to the bottom still counts as following the newest line */
const NEAR_BOTTOM_PX = 48;

const haystacks = new WeakMap<LogEntry, string>();

/** Everything about an entry that text search should match, lowercased */
function haystack(entry: LogEntry): string {
  let text = haystacks.get(entry);
  if (text === undefined) {
    text = [
      entry.message,
      entry.target,
      ...Object.entries(entry.fields).flat(),
      ...entry.spans.flatMap(span => [span.name, ...Object.entries(span.fields).flat()])
    ]
      .join("\n")
      .toLowerCase();
    haystacks.set(entry, text);
  }
  return text;
}

function LogRow(props: { entry: LogEntry }) {
  const [open, setOpen] = createSignal(false);
  const fields = () => Object.entries(props.entry.fields);

  return (
    <div class="border-base-300 hover:bg-base-200 border-b px-3 py-1 font-mono text-xs">
      <button
        type="button"
        class="flex w-full items-start gap-2 text-left"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        <span class="text-base-content/50 shrink-0 tabular-nums">{formatClock(props.entry.timestamp)}</span>
        <span class={`badge badge-xs badge-soft w-12 shrink-0 ${LEVEL_BADGE[props.entry.level]}`}>
          {props.entry.level}
        </span>
        <span class="min-w-0 flex-1 break-words" classList={{ "line-clamp-3": !open() }}>
          <span class="text-base-content/50">{props.entry.target}</span> {props.entry.message}
          <For each={fields()}>
            {([key, value]) => (
              <span class="text-base-content/60 ml-2">
                {key}=<span class="text-base-content">{value}</span>
              </span>
            )}
          </For>
        </span>
      </button>

      <Show when={open()}>
        <div class="bg-base-200 mt-2 mb-1 space-y-2 rounded p-3">
          <Show when={props.entry.spans.length > 0}>
            <div>
              <div class="text-base-content/60 mb-1">Spans, outermost first</div>
              <For each={props.entry.spans}>
                {span => (
                  <div>
                    <span class="font-semibold">{span.name}</span>
                    <For each={Object.entries(span.fields)}>
                      {([key, value]) => (
                        <span class="text-base-content/60 ml-2">
                          {key}=<span class="text-base-content">{value}</span>
                        </span>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <pre class="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(props.entry, null, 2)}</pre>
        </div>
      </Show>
    </div>
  );
}

export default function Logs() {
  const [search, setSearch] = useSearchParams();

  const release = logStore.acquire();
  onCleanup(release);

  const str = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;
  const set = (patch: Record<string, string | undefined>) => setSearch(patch, { replace: true });

  const enabledLevels = createMemo(() => {
    const listed = str(search.levels)?.split(",") ?? [];
    const valid = LEVELS.filter(level => listed.includes(level));
    return new Set(valid.length > 0 ? valid : LEVELS);
  });

  function toggleLevel(level: LogLevel) {
    const next = new Set(enabledLevels());
    if (next.has(level)) {
      // Hiding every level would only ever show an empty page
      if (next.size === 1) return;
      next.delete(level);
    } else {
      next.add(level);
    }
    set({ levels: next.size === LEVELS.length ? undefined : LEVELS.filter(l => next.has(l)).join(",") });
  }

  const counts = createMemo(() => {
    const total: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, debug: 0, trace: 0 };
    for (const item of logStore.items()) if (item.kind === "entry") total[item.entry.level]++;
    return total;
  });

  const targets = createMemo(() => {
    const seen = new Set<string>();
    for (const item of logStore.items()) if (item.kind === "entry") seen.add(item.entry.target);
    return [...seen].sort();
  });

  const visible = createMemo(() => {
    const levels = enabledLevels();
    const target = str(search.target);
    const needle = str(search.q)?.trim().toLowerCase();

    return logStore.items().filter(item => {
      // Gaps and restarts stay, since they explain what the lines around them are
      if (item.kind !== "entry") return true;
      const { entry } = item;
      if (!levels.has(entry.level)) return false;
      if (target && entry.target !== target && !entry.target.startsWith(`${target}::`)) return false;
      return !needle || haystack(entry).includes(needle);
    });
  });

  const visibleCount = () => visible().filter(item => item.kind === "entry").length;
  const totalCount = () => LEVELS.reduce((sum, level) => sum + counts()[level], 0);
  const filtering = () => enabledLevels().size < LEVELS.length || !!str(search.target) || !!str(search.q);

  // Following the newest line until the user scrolls up
  const [follow, setFollow] = createSignal(true);
  let scroller: HTMLDivElement | undefined;

  const onScroll = () => {
    if (!scroller) return;
    setFollow(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_BOTTOM_PX);
  };

  createEffect(() => {
    visible();
    if (follow() && scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  function download() {
    const lines = visible().flatMap(item => (item.kind === "entry" ? [JSON.stringify(item.entry)] : []));
    const url = URL.createObjectURL(new Blob([`${lines.join("\n")}\n`], { type: "application/x-ndjson" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `kosync-rs-logs-${new Date().toISOString()}.jsonl`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Logs" description="What the server logs, as it happens">
        <span class="badge badge-ghost gap-2">
          <span
            class="status"
            classList={{
              "status-success": logStore.status() === "live",
              "status-warning": logStore.status() !== "live"
            }}
          />
          {STATUS_LABEL[logStore.status()]}
        </span>
      </PageHeader>

      <div class="space-y-3">
        <Show when={logStore.error()}>
          {message => (
            <div role="alert" class="alert alert-warning alert-soft">
              <Icon name="warning" />
              <span>
                Log stream: {message()}. Retrying
                <span class="loading loading-dots loading-xs ml-1" />
              </span>
            </div>
          )}
        </Show>

        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <label class="input input-sm min-w-48 flex-1">
                <Icon name="search" class="size-4 opacity-60" />
                <input
                  type="search"
                  placeholder="Search messages, fields and spans"
                  value={str(search.q) ?? ""}
                  onInput={e => set({ q: e.currentTarget.value || undefined })}
                />
              </label>

              <select
                class="select select-sm w-auto max-w-56"
                aria-label="Target"
                onChange={e => set({ target: e.currentTarget.value || undefined })}
              >
                <option value="" selected={!str(search.target)}>
                  All targets
                </option>
                {/* A target from the URL may not have logged yet */}
                <Show when={str(search.target) && !targets().includes(str(search.target)!)}>
                  <option value={str(search.target)} selected>
                    {str(search.target)}
                  </option>
                </Show>
                <For each={targets()}>
                  {target => (
                    <option value={target} selected={str(search.target) === target}>
                      {target}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <div class="flex flex-wrap gap-1" role="group" aria-label="Levels">
                <For each={LEVELS}>
                  {level => (
                    <button
                      type="button"
                      class="btn btn-xs"
                      classList={{
                        [LEVEL_BUTTON[level]]: enabledLevels().has(level),
                        "btn-ghost": !enabledLevels().has(level)
                      }}
                      aria-pressed={enabledLevels().has(level)}
                      onClick={() => toggleLevel(level)}
                    >
                      {level}
                      <span class="tabular-nums opacity-70">{counts()[level]}</span>
                    </button>
                  )}
                </For>
              </div>

              <div class="ml-auto flex flex-wrap items-center gap-2">
                <span class="text-base-content/60 text-xs">
                  {filtering() ? `${visibleCount()} of ${totalCount()}` : totalCount()} lines
                  <Show when={totalCount() >= MAX_LOG_ITEMS}> (newest {MAX_LOG_ITEMS} kept)</Show>
                </span>
                <button
                  type="button"
                  class="btn btn-xs"
                  classList={{ "btn-warning": logStore.paused() }}
                  onClick={() => logStore.setPaused(!logStore.paused())}
                >
                  <Icon name={logStore.paused() ? "play" : "pause"} class="size-4" />
                  {logStore.paused() ? `Resume (${logStore.heldCount()} new)` : "Pause"}
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  disabled={follow()}
                  onClick={() => setFollow(true)}
                  title="Scroll to the newest line and keep following"
                >
                  <Icon name="arrowDown" class="size-4" />
                  Latest
                </button>
                <button type="button" class="btn btn-xs" disabled={visibleCount() === 0} onClick={download}>
                  Download
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  disabled={totalCount() === 0}
                  onClick={() => logStore.clear()}
                >
                  <Icon name="trash" class="size-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scroller}
          onScroll={onScroll}
          class="bg-base-100 border-base-300 h-[calc(100dvh-20rem)] min-h-80 overflow-y-auto rounded-lg border"
        >
          <Switch>
            <Match when={visible().length > 0}>
              <For each={visible()}>
                {item => (
                  <Switch>
                    <Match when={item.kind === "entry" && item}>{entry => <LogRow entry={entry().entry} />}</Match>
                    <Match when={item.kind === "gap" && item}>
                      {gap => (
                        <div class="divider text-warning my-1 text-xs">
                          {(gap() as { skipped: number }).skipped} lines skipped
                        </div>
                      )}
                    </Match>
                    <Match when={item.kind === "restart"}>
                      <div class="divider text-info my-1 text-xs">Server restarted</div>
                    </Match>
                  </Switch>
                )}
              </For>
            </Match>
            <Match when={totalCount() > 0}>
              <p class="text-base-content/60 p-8 text-center">No lines match these filters.</p>
            </Match>
            <Match when={true}>
              <p class="text-base-content/60 p-8 text-center">
                No log lines yet. The server only streams what passes <code>RUST_LOG</code>, so raise the level to
                see more.
              </p>
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );
}
