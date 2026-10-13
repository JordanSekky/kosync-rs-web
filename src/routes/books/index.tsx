import { A } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { listBooks } from "~/client";
import { Async, EmptyState } from "~/components/Feedback";
import Icon from "~/components/Icon";
import PageHeader from "~/components/PageHeader";
import Time from "~/components/Time";
import { unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { bookLabel } from "~/lib/format";

export default function Books() {
  const [books, { refetch }] = createResource(() => unwrap(listBooks()));
  const [query, setQuery] = createSignal("");

  const visible = createMemo(() => {
    const needle = query().trim().toLowerCase();
    return (latestOf(books)?.books ?? []).filter(
      b =>
        !needle ||
        [b.title, b.authors, b.filename, b.document].some(field => field?.toLowerCase().includes(needle))
    );
  });

  return (
    <>
      <PageHeader title="Books" description="Documents with progress history, most recently synced first">
        <label class="input input-sm">
          <Icon name="search" class="size-4 opacity-60" />
          <input
            type="search"
            placeholder="Title, author or file"
            value={query()}
            onInput={e => setQuery(e.currentTarget.value)}
          />
        </label>
        <button type="button" class="btn btn-sm" onClick={() => void refetch()}>
          Refresh
        </button>
      </PageHeader>

      <Async resource={books} onRetry={() => void refetch()}>
        {data => (
          <Show
            when={data.books.length > 0}
            fallback={<EmptyState title="No books yet">Books appear once a client pushes progress.</EmptyState>}
          >
            <div class="card bg-base-100 border-base-300 border">
              <div class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>File</th>
                      <th class="text-right">Readers</th>
                      <th class="text-right">Entries</th>
                      <th>Last synced</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={visible()}
                      fallback={
                        <tr>
                          <td colSpan={5} class="text-base-content/60 text-center">
                            No book matches “{query()}”.
                          </td>
                        </tr>
                      }
                    >
                      {book => (
                        <tr class="hover:bg-base-200">
                          <td class="max-w-80">
                            <A
                              href={`/books/${encodeURIComponent(book.document)}`}
                              class="link link-hover block truncate font-medium"
                            >
                              {bookLabel(book)}
                            </A>
                            <Show when={book.authors}>
                              <div class="text-base-content/60 truncate text-xs">{book.authors}</div>
                            </Show>
                          </td>
                          <td class="text-base-content/60 max-w-56 truncate text-sm" title={book.filename ?? undefined}>
                            {book.filename ?? "–"}
                          </td>
                          <td class="text-right tabular-nums">{book.reader_count}</td>
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
    </>
  );
}
