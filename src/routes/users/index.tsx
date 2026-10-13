import { A } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { listUsers, type UserResponse } from "~/client";
import { Async, EmptyState } from "~/components/Feedback";
import Icon from "~/components/Icon";
import PageHeader from "~/components/PageHeader";
import Time from "~/components/Time";
import { unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { parseTime } from "~/lib/format";

type SortKey = "username" | "created_at" | "entry_count" | "book_count" | "last_active_at";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "username", label: "Username" },
  { key: "created_at", label: "Registered" },
  { key: "entry_count", label: "Entries", numeric: true },
  { key: "book_count", label: "Books", numeric: true },
  { key: "last_active_at", label: "Last active" }
];

function sortValue(user: UserResponse, key: SortKey): string | number {
  switch (key) {
    case "username":
      return user.username.toLowerCase();
    case "created_at":
      return parseTime(user.created_at).getTime();
    case "last_active_at":
      // Users who never synced sort as the oldest
      return user.last_active_at ? parseTime(user.last_active_at).getTime() : -Infinity;
    default:
      return user[key];
  }
}

export default function Users() {
  const [users, { refetch }] = createResource(() => unwrap(listUsers()));
  const [query, setQuery] = createSignal("");
  const [sort, setSort] = createSignal<{ key: SortKey; dir: 1 | -1 }>({ key: "last_active_at", dir: -1 });

  const visible = createMemo(() => {
    const needle = query().trim().toLowerCase();
    const { key, dir } = sort();
    return (latestOf(users)?.users ?? [])
      .filter(u => !needle || u.username.toLowerCase().includes(needle))
      .sort((a, b) => {
        const x = sortValue(a, key);
        const y = sortValue(b, key);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
  });

  const toggleSort = (key: SortKey) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === -1 ? 1 : -1 }));

  return (
    <>
      <PageHeader title="Users" description="Accounts registered on the sync server">
        <label class="input input-sm">
          <Icon name="search" class="size-4 opacity-60" />
          <input
            type="search"
            placeholder="Filter by name"
            value={query()}
            onInput={e => setQuery(e.currentTarget.value)}
          />
        </label>
        <button type="button" class="btn btn-sm" onClick={() => void refetch()}>
          Refresh
        </button>
      </PageHeader>

      <Async resource={users} onRetry={() => void refetch()}>
        {data => (
          <Show
            when={data.users.length > 0}
            fallback={
              <EmptyState title="No users yet">Register from a KOReader client to create the first account.</EmptyState>
            }
          >
            <div class="card bg-base-100 border-base-300 border">
              <div class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <For each={COLUMNS}>
                        {column => (
                          <th
                            classList={{ "text-right": column.numeric }}
                            aria-sort={
                              sort().key === column.key ? (sort().dir === 1 ? "ascending" : "descending") : "none"
                            }
                          >
                            <button type="button" class="hover:text-base-content" onClick={() => toggleSort(column.key)}>
                              {column.label}
                              <Show when={sort().key === column.key}>
                                <span aria-hidden="true">{sort().dir === 1 ? " ↑" : " ↓"}</span>
                              </Show>
                            </button>
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={visible()}
                      fallback={
                        <tr>
                          <td colSpan={COLUMNS.length} class="text-base-content/60 text-center">
                            No user matches “{query()}”.
                          </td>
                        </tr>
                      }
                    >
                      {user => (
                        <tr class="hover:bg-base-200">
                          <td>
                            <A href={`/users/${user.id}`} class="link link-hover font-medium">
                              {user.username}
                            </A>
                          </td>
                          <td>
                            <Time iso={user.created_at} />
                          </td>
                          <td class="text-right tabular-nums">{user.entry_count}</td>
                          <td class="text-right tabular-nums">{user.book_count}</td>
                          <td>
                            <Time iso={user.last_active_at} />
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
    </>
  );
}
