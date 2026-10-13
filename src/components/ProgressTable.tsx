import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { ProgressEntryResponse } from "~/client";
import { bookLabel, formatPercent } from "~/lib/format";
import Time from "./Time";

export default function ProgressTable(props: { entries: ProgressEntryResponse[]; showUser?: boolean }) {
  const showUser = () => props.showUser ?? true;

  return (
    <div class="overflow-x-auto">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>When</th>
            <Show when={showUser()}>
              <th>User</th>
            </Show>
            <th>Book</th>
            <th>Progress</th>
            <th>Device</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.entries}>
            {entry => (
              <tr class="hover:bg-base-200">
                <td class="whitespace-nowrap">
                  <Time iso={entry.timestamp} />
                </td>
                <Show when={showUser()}>
                  <td>
                    <A href={`/users/${entry.user_id}`} class="link link-hover">
                      {entry.username}
                    </A>
                  </td>
                </Show>
                <td class="max-w-72">
                  <A
                    href={`/books/${encodeURIComponent(entry.document)}`}
                    class="link link-hover block truncate font-medium"
                    title={entry.filename ?? entry.document}
                  >
                    {bookLabel(entry)}
                  </A>
                  <Show when={entry.authors}>
                    <div class="text-base-content/60 truncate text-xs">{entry.authors}</div>
                  </Show>
                </td>
                <td class="min-w-44">
                  <div class="flex items-center gap-2">
                    <progress class="progress w-24" value={entry.percentage * 100} max="100" />
                    <span class="text-sm tabular-nums">{formatPercent(entry.percentage)}</span>
                  </div>
                  <div class="text-base-content/50 max-w-56 truncate font-mono text-xs" title={entry.progress}>
                    {entry.progress}
                  </div>
                </td>
                <td class="whitespace-nowrap">
                  <span title={entry.device_id ?? undefined}>{entry.device}</span>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
