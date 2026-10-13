import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { listDevices } from "~/client";
import { Async, EmptyState } from "~/components/Feedback";
import PageHeader from "~/components/PageHeader";
import Time from "~/components/Time";
import { unwrap } from "~/lib/api";
import { progressHref } from "~/lib/filters";

export default function Devices() {
  const [devices, { refetch }] = createResource(() => unwrap(listDevices()));

  return (
    <>
      <PageHeader title="Devices" description="Where progress was pushed from, most recently seen first">
        <button type="button" class="btn btn-sm" onClick={() => void refetch()}>
          Refresh
        </button>
      </PageHeader>

      <Async resource={devices} onRetry={() => void refetch()}>
        {data => (
          <Show
            when={data.devices.length > 0}
            fallback={<EmptyState title="No devices yet">Devices appear once a client pushes progress.</EmptyState>}
          >
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
                              href={progressHref({
                                device: device.device,
                                device_id: device.device_id ?? undefined
                              })}
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
    </>
  );
}
