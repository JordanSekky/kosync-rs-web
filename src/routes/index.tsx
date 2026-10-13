import { A } from "@solidjs/router";
import { createMemo, createResource, For, Show } from "solid-js";
import { listBooks, listDevices, listProgress, listUsers } from "~/client";
import { Async } from "~/components/Feedback";
import PageHeader from "~/components/PageHeader";
import ProgressTable from "~/components/ProgressTable";
import Time from "~/components/Time";
import { unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { parseTime } from "~/lib/format";

const RECENT_ENTRIES = 10;
const ACTIVE_USERS = 5;

export default function Dashboard() {
  const [users, { refetch: refetchUsers }] = createResource(() => unwrap(listUsers()));
  const [books, { refetch: refetchBooks }] = createResource(() => unwrap(listBooks()));
  const [devices, { refetch: refetchDevices }] = createResource(() => unwrap(listDevices()));
  const [recent, { refetch: refetchRecent }] = createResource(() =>
    unwrap(listProgress({ query: { limit: RECENT_ENTRIES } }))
  );

  const refresh = () => {
    void refetchUsers();
    void refetchBooks();
    void refetchDevices();
    void refetchRecent();
  };

  const totalEntries = () => latestOf(users)?.users.reduce((sum, u) => sum + u.entry_count, 0);

  const lastActivity = createMemo(() => {
    const times = (latestOf(users)?.users ?? [])
      .map(u => u.last_active_at)
      .filter((t): t is string => !!t);
    // Timestamps vary in precision, so compare them as dates rather than text
    return times.sort((a, b) => parseTime(b).getTime() - parseTime(a).getTime())[0];
  });

  const activeUsers = createMemo(() =>
    (latestOf(users)?.users ?? [])
      .filter(u => u.last_active_at)
      .sort((a, b) => parseTime(b.last_active_at!).getTime() - parseTime(a.last_active_at!).getTime())
      .slice(0, ACTIVE_USERS)
  );

  return (
    <>
      <PageHeader title="Dashboard" description="What is syncing through this server">
        <button type="button" class="btn btn-sm" onClick={refresh}>
          Refresh
        </button>
      </PageHeader>

      <div class="space-y-6">
        <div class="stats stats-vertical sm:stats-horizontal bg-base-100 border-base-300 w-full border">
          <div class="stat">
            <div class="stat-title">Users</div>
            <div class="stat-value">{latestOf(users)?.users.length ?? "–"}</div>
            <div class="stat-desc">{totalEntries() ?? "–"} history entries</div>
          </div>
          <div class="stat">
            <div class="stat-title">Books</div>
            <div class="stat-value">{latestOf(books)?.books.length ?? "–"}</div>
            <div class="stat-desc">with progress history</div>
          </div>
          <div class="stat">
            <div class="stat-title">Devices</div>
            <div class="stat-value">{latestOf(devices)?.devices.length ?? "–"}</div>
            <div class="stat-desc">pushed from</div>
          </div>
          <div class="stat">
            <div class="stat-title">Last activity</div>
            <div class="stat-value text-2xl">
              <Time iso={lastActivity()} fallback="Never" />
            </div>
          </div>
        </div>

        <div class="grid gap-6 2xl:grid-cols-3">
          <section class="space-y-2 2xl:col-span-2">
            <div class="flex items-baseline justify-between">
              <h2 class="text-lg font-semibold">Recent progress</h2>
              <A href="/progress" class="link link-hover text-sm">
                View all
              </A>
            </div>
            <div class="card bg-base-100 border-base-300 border">
              <Async resource={recent} onRetry={() => void refetchRecent()}>
                {data => (
                  <Show
                    when={data.entries.length > 0}
                    fallback={<p class="text-base-content/60 p-6 text-center">No progress recorded yet.</p>}
                  >
                    <ProgressTable entries={data.entries} />
                  </Show>
                )}
              </Async>
            </div>
          </section>

          <section class="space-y-2">
            <div class="flex items-baseline justify-between">
              <h2 class="text-lg font-semibold">Most recently active</h2>
              <A href="/users" class="link link-hover text-sm">
                All users
              </A>
            </div>
            <div class="card bg-base-100 border-base-300 border">
              <Async resource={users} onRetry={() => void refetchUsers()}>
                {() => (
                  <ul class="divide-base-300 divide-y">
                    <For
                      each={activeUsers()}
                      fallback={<li class="text-base-content/60 p-6 text-center">No activity yet.</li>}
                    >
                      {user => (
                        <li>
                          <A
                            href={`/users/${user.id}`}
                            class="hover:bg-base-200 flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <span class="font-medium">{user.username}</span>
                            <span class="text-base-content/60 text-sm">
                              <Time iso={user.last_active_at} />
                            </span>
                          </A>
                        </li>
                      )}
                    </For>
                  </ul>
                )}
              </Async>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
