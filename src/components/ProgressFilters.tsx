import { useSearchParams } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { listBooks, listDevices, listUsers } from "~/client";
import { unwrap } from "~/lib/api";
import { latestOf } from "~/lib/resource";
import { FILTER_PARAMS } from "~/lib/filters";
import { bookLabel, fromLocalInput, toLocalInput } from "~/lib/format";

const QUICK_RANGES: [string, number][] = [
  ["24 hours", 24],
  ["7 days", 24 * 7],
  ["30 days", 24 * 30]
];

const HOUR_MS = 3_600_000;

type Patch = Record<string, string | undefined>;

/**
 * Filters for progress history, kept in the URL's search params. Pass `userId`
 * on a user's own page, where the user can't be changed.
 */
export default function ProgressFilters(props: { userId?: number }) {
  const [params, setParams] = useSearchParams();

  const str = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;
  // Replacing keeps the back button for page-to-page navigation
  const set = (patch: Patch) => setParams(patch, { replace: true });

  const selectedUser = () => props.userId ?? (Number(str(params.user_id)) || undefined);

  // Book and device choices are narrowed to the selected user. Resources only
  // fetch for a truthy key, hence the strings.
  const [users] = createResource(
    () => props.userId === undefined || undefined,
    () => unwrap(listUsers())
  );
  const [books] = createResource(
    () => String(selectedUser() ?? "all"),
    key => unwrap(listBooks({ query: { user_id: key === "all" ? undefined : Number(key) } }))
  );
  const [devices] = createResource(
    () => String(selectedUser() ?? "all"),
    key => unwrap(listDevices({ query: { user_id: key === "all" ? undefined : Number(key) } }))
  );

  const deviceList = () => latestOf(devices)?.devices ?? [];

  const selectedDevice = () => {
    const name = str(params.device);
    const id = str(params.device_id);
    if (!name && !id) return "";
    const index = deviceList().findIndex(d => d.device === name && (d.device_id ?? undefined) === id);
    return index >= 0 ? String(index) : "";
  };

  const reset = () => set(Object.fromEntries(FILTER_PARAMS.map(key => [key, undefined])));
  const active = () => FILTER_PARAMS.some(key => (key === "user_id" && props.userId !== undefined ? false : str(params[key])));

  return (
    <div class="card bg-base-100 border-base-300 border">
      <div class="card-body gap-3 p-4">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
          <Show when={props.userId === undefined}>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">User</legend>
              <select
                class="select select-sm w-full"
                onChange={e =>
                  // The other lists change with the user, so their choices no longer apply
                  set({
                    user_id: e.currentTarget.value || undefined,
                    document: undefined,
                    device: undefined,
                    device_id: undefined
                  })
                }
              >
                <option value="" selected={!selectedUser()}>
                  All users
                </option>
                <For each={latestOf(users)?.users ?? []}>
                  {user => (
                    <option value={user.id} selected={selectedUser() === user.id}>
                      {user.username}
                    </option>
                  )}
                </For>
              </select>
            </fieldset>
          </Show>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Book</legend>
            <select
              class="select select-sm w-full"
              onChange={e => set({ document: e.currentTarget.value || undefined })}
            >
              <option value="" selected={!str(params.document)}>
                All books
              </option>
              <For each={latestOf(books)?.books ?? []}>
                {book => (
                  <option value={book.document} selected={str(params.document) === book.document}>
                    {bookLabel(book)}
                    {book.authors ? ` — ${book.authors}` : ""}
                  </option>
                )}
              </For>
            </select>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Device</legend>
            <select
              class="select select-sm w-full"
              onChange={e => {
                const item = deviceList()[Number(e.currentTarget.value)];
                set({ device: item?.device, device_id: item?.device_id ?? undefined });
              }}
            >
              <option value="" selected={selectedDevice() === ""}>
                All devices
              </option>
              <For each={deviceList()}>
                {(device, index) => (
                  <option value={index()} selected={selectedDevice() === String(index())}>
                    {device.device}
                    {device.device_id ? ` (${device.device_id.slice(0, 8)})` : ""}
                  </option>
                )}
              </For>
            </select>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">From</legend>
            <input
              type="datetime-local"
              class="input input-sm w-full"
              value={toLocalInput(str(params.from))}
              onChange={e => set({ from: fromLocalInput(e.currentTarget.value) })}
            />
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">To</legend>
            <input
              type="datetime-local"
              class="input input-sm w-full"
              value={toLocalInput(str(params.to))}
              onChange={e => set({ to: fromLocalInput(e.currentTarget.value) })}
            />
          </fieldset>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-base-content/60 text-sm">Last</span>
          <div class="join">
            <For each={QUICK_RANGES}>
              {([label, hours]) => (
                <button
                  type="button"
                  class="btn btn-sm join-item"
                  onClick={() => set({ from: new Date(Date.now() - hours * HOUR_MS).toISOString(), to: undefined })}
                >
                  {label}
                </button>
              )}
            </For>
          </div>
          <button type="button" class="btn btn-sm btn-ghost ml-auto" disabled={!active()} onClick={reset}>
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
