import { A, useParams } from "@solidjs/router";
import { createMemo, createResource, For, Show } from "solid-js";
import { listBooks, listProgress, listUsers, type ProgressEntryResponse } from "~/client";
import { Async } from "~/components/Feedback";
import PageHeader from "~/components/PageHeader";
import ProgressFeed from "~/components/ProgressFeed";
import Time from "~/components/Time";
import { unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { bookLabel, formatPercent } from "~/lib/format";
import { createProgressPages } from "~/lib/progress";

export default function BookPage() {
  const params = useParams();
  const document = () => params.document;

  // There is no endpoint for a single book, so it is picked out of the list
  const [book, { refetch }] = createResource(
    () => document(),
    async doc => (await unwrap(listBooks())).books.find(b => b.document === doc) ?? null
  );

  // Where each reader got to: their newest entry for this document
  const [readers] = createResource(
    () => document(),
    async doc => {
      const { users } = await unwrap(listUsers());
      const latest = await Promise.all(
        users.map(async user => {
          const page = await unwrap(listProgress({ query: { user_id: user.id, document: doc, limit: 1 } }));
          return page.entries[0];
        })
      );
      return latest.filter((entry): entry is ProgressEntryResponse => entry !== undefined);
    }
  );

  const title = () => {
    const info = latestOf(book);
    return info ? bookLabel(info) : "Book";
  };

  const filter = createMemo(() => ({ document: document() }));
  const pages = createProgressPages(filter);

  return (
    <>
      <PageHeader title={title()} description={latestOf(book)?.authors ?? undefined} />

      <div class="space-y-6">
        <Async resource={book} onRetry={() => void refetch()}>
          {data => (
            <Show
              when={data}
              fallback={<p class="text-base-content/60">No history for this document.</p>}
            >
              {info => (
                <div class="stats stats-vertical sm:stats-horizontal bg-base-100 border-base-300 w-full border">
                  <div class="stat">
                    <div class="stat-title">Readers</div>
                    <div class="stat-value">{info().reader_count}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Entries</div>
                    <div class="stat-value">{info().entry_count}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Last synced</div>
                    <div class="stat-value text-2xl">
                      <Time iso={info().last_activity_at} />
                    </div>
                  </div>
                  <div class="stat min-w-0">
                    <div class="stat-title">File</div>
                    <div class="stat-value truncate text-base" title={info().filename ?? undefined}>
                      {info().filename ?? "–"}
                    </div>
                    <div class="stat-desc font-mono" title="Document hash">
                      {info().document}
                    </div>
                  </div>
                </div>
              )}
            </Show>
          )}
        </Async>

        <section class="space-y-2">
          <h2 class="text-lg font-semibold">Readers</h2>
          <div class="card bg-base-100 border-base-300 border">
            <Async resource={readers}>
              {data => (
                <div class="overflow-x-auto">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Progress</th>
                        <th>Device</th>
                        <th>Last synced</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For
                        each={data}
                        fallback={
                          <tr>
                            <td colSpan={4} class="text-base-content/60 text-center">
                              Nobody has synced this book.
                            </td>
                          </tr>
                        }
                      >
                        {entry => (
                          <tr class="hover:bg-base-200">
                            <td>
                              <A href={`/users/${entry.user_id}`} class="link link-hover font-medium">
                                {entry.username}
                              </A>
                            </td>
                            <td>
                              <div class="flex items-center gap-2">
                                <progress class="progress w-24" value={entry.percentage * 100} max="100" />
                                <span class="text-sm tabular-nums">{formatPercent(entry.percentage)}</span>
                              </div>
                            </td>
                            <td>{entry.device}</td>
                            <td>
                              <Time iso={entry.timestamp} />
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              )}
            </Async>
          </div>
        </section>

        <section class="space-y-2">
          <h2 class="text-lg font-semibold">History</h2>
          <ProgressFeed pages={pages} />
        </section>
      </div>
    </>
  );
}
