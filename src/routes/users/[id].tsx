import { A, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createResource, For, Match, Show, Switch } from "solid-js";
import { getUser, listBooks, listDevices, listProgress } from "~/client";
import { Async, EmptyState } from "~/components/Feedback";
import PageHeader from "~/components/PageHeader";
import ProgressFeed from "~/components/ProgressFeed";
import ProgressFilters from "~/components/ProgressFilters";
import Time from "~/components/Time";
import { ApiError, unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { FILTER_PARAMS, filterFromParams, hasFilter, progressHref, sameFilter } from "~/lib/filters";
import { bookLabel, formatPercent } from "~/lib/format";
import { createProgressPages } from "~/lib/progress";

const TABS = [
  { id: "history", label: "History" },
  { id: "books", label: "Books" },
  { id: "devices", label: "Devices" }
] as const;

type TabId = (typeof TABS)[number]["id"];

function HistoryTab(props: { userId: number }) {
  const [search] = useSearchParams();
  const filter = createMemo(() => filterFromParams(search, { user_id: props.userId }), undefined, {
    equals: sameFilter
  });
  const pages = createProgressPages(filter);

  return (
    <div class="space-y-4">
      <ProgressFilters userId={props.userId} />
      <ProgressFeed pages={pages} showUser={false} filtered={hasFilter(filter(), ["user_id"])} />
    </div>
  );
}

function LatestPercentage(props: { userId: number; document: string }) {
  const [latest] = createResource(
    () => props.document,
    async document => {
      const page = await unwrap(listProgress({ query: { user_id: props.userId, document, limit: 1 } }));
      return page.entries[0] ?? null;
    }
  );

  return (
    <Show when={latest.state === "ready" && latest()} fallback={<span class="text-base-content/40">–</span>}>
      {entry => (
        <div class="flex items-center gap-2">
          <progress class="progress w-20" value={entry().percentage * 100} max="100" />
          <span class="text-sm tabular-nums">{formatPercent(entry().percentage)}</span>
        </div>
      )}
    </Show>
  );
}

function BooksTab(props: { userId: number }) {
  const [books, { refetch }] = createResource(
    () => props.userId,
    id => unwrap(listBooks({ query: { user_id: id } }))
  );

  return (
    <Async resource={books} onRetry={() => void refetch()}>
      {data => (
        <Show when={data.books.length > 0} fallback={<EmptyState title="No books synced yet" />}>
          <div class="card bg-base-100 border-base-300 border">
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Progress</th>
                    <th class="text-right">Entries</th>
                    <th>Last synced</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data.books}>
                    {book => (
                      <tr class="hover:bg-base-200">
                        <td class="max-w-80">
                          <A
                            href={`/users/${props.userId}?document=${encodeURIComponent(book.document)}`}
                            class="link link-hover block truncate font-medium"
                          >
                            {bookLabel(book)}
                          </A>
                          <Show when={book.authors}>
                            <div class="text-base-content/60 truncate text-xs">{book.authors}</div>
                          </Show>
                        </td>
                        <td>
                          <LatestPercentage userId={props.userId} document={book.document} />
                        </td>
                        <td class="text-right tabular-nums">{book.entry_count}</td>
                        <td>
                          <Time iso={book.last_activity_at} />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      )}
    </Async>
  );
}

function DevicesTab(props: { userId: number }) {
  const [devices, { refetch }] = createResource(
    () => props.userId,
    id => unwrap(listDevices({ query: { user_id: id } }))
  );

  return (
    <Async resource={devices} onRetry={() => void refetch()}>
      {data => (
        <Show when={data.devices.length > 0} fallback={<EmptyState title="No devices yet" />}>
          <div class="card bg-base-100 border-base-300 border">
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Device ID</th>
                    <th class="text-right">Entries</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data.devices}>
                    {device => (
                      <tr class="hover:bg-base-200">
                        <td>
                          <A
                            href={`/users/${props.userId}?${new URLSearchParams(
                              Object.entries({ device: device.device, device_id: device.device_id ?? "" }).filter(
                                ([, value]) => value
                              )
                            )}`}
                            class="link link-hover font-medium"
                          >
                            {device.device}
                          </A>
                        </td>
                        <td class="font-mono text-xs">{device.device_id ?? "–"}</td>
                        <td class="text-right tabular-nums">{device.entry_count}</td>
                        <td>
                          <Time iso={device.last_seen_at} />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      )}
    </Async>
  );
}

export default function UserPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();

  const userId = () => Number(params.id);
  const [user, { refetch }] = createResource(
    () => params.id,
    id => unwrap(getUser({ path: { id: Number(id) } }))
  );

  const tab = (): TabId => {
    const value = Array.isArray(search.tab) ? search.tab[0] : search.tab;
    return TABS.find(t => t.id === value)?.id ?? "history";
  };

  // Filters belong to the history tab, so they don't carry over to another one
  const selectTab = (id: TabId) =>
    setSearch({
      tab: id === "history" ? undefined : id,
      ...Object.fromEntries(FILTER_PARAMS.map(key => [key, undefined]))
    });

  const notFound = () => user.error instanceof ApiError && user.error.status === 404;

  return (
    <Switch>
      <Match when={notFound()}>
        <PageHeader title="User not found" />
        <EmptyState title={`There is no user with id ${params.id}`}>
          <A href="/users" class="link">
            Back to users
          </A>
        </EmptyState>
      </Match>
      <Match when={true}>
        <PageHeader title={latestOf(user)?.username ?? "User"} description="Reading history for this account">
          <A href={progressHref({ user_id: userId() })} class="btn btn-sm">
            Open in progress history
          </A>
        </PageHeader>

        <div class="space-y-4">
          <Async resource={user} onRetry={() => void refetch()}>
            {data => (
              <div class="stats stats-vertical sm:stats-horizontal bg-base-100 border-base-300 w-full border">
                <div class="stat">
                  <div class="stat-title">Entries</div>
                  <div class="stat-value">{data.entry_count}</div>
                </div>
                <div class="stat">
                  <div class="stat-title">Books</div>
                  <div class="stat-value">{data.book_count}</div>
                </div>
                <div class="stat">
                  <div class="stat-title">Last active</div>
                  <div class="stat-value text-2xl">
                    <Time iso={data.last_active_at} />
                  </div>
                </div>
                <div class="stat">
                  <div class="stat-title">Registered</div>
                  <div class="stat-value text-2xl">
                    <Time iso={data.created_at} />
                  </div>
                </div>
              </div>
            )}
          </Async>

          <div role="tablist" class="tabs tabs-border">
            <For each={TABS}>
              {item => (
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  classList={{ "tab-active": tab() === item.id }}
                  aria-selected={tab() === item.id}
                  onClick={() => selectTab(item.id)}
                >
                  {item.label}
                </button>
              )}
            </For>
          </div>

          <Show when={user.state === "ready"}>
            <Switch>
              <Match when={tab() === "history"}>
                <HistoryTab userId={userId()} />
              </Match>
              <Match when={tab() === "books"}>
                <BooksTab userId={userId()} />
              </Match>
              <Match when={tab() === "devices"}>
                <DevicesTab userId={userId()} />
              </Match>
            </Switch>
          </Show>
        </div>
      </Match>
    </Switch>
  );
}
