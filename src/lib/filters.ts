import type { ListProgressQuery } from "~/client";

export type ProgressFilter = Omit<ListProgressQuery, "cursor" | "limit">;

type Params = Partial<Record<string, string | string[]>>;

/** Search params the progress filters live in, so a filtered view can be linked to */
export const FILTER_PARAMS = ["user_id", "document", "device", "device_id", "from", "to"] as const;

function first(params: Params, key: string): string | undefined {
  const value = params[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single || undefined;
}

export function filterFromParams(params: Params, scope?: { user_id?: number }): ProgressFilter {
  const userParam = first(params, "user_id");
  const user = userParam === undefined ? undefined : Number(userParam);

  return {
    user_id: scope?.user_id ?? (Number.isInteger(user) ? user : undefined),
    document: first(params, "document"),
    device: first(params, "device"),
    device_id: first(params, "device_id"),
    from: first(params, "from"),
    to: first(params, "to")
  };
}

export function hasFilter(filter: ProgressFilter, ignore: (keyof ProgressFilter)[] = []): boolean {
  return Object.entries(filter).some(
    ([key, value]) => value !== undefined && !ignore.includes(key as keyof ProgressFilter)
  );
}

/** Query string for linking to the progress page with a filter applied */
export function progressHref(filter: ProgressFilter, base = "/progress"): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

/** For memos, so setting the same search params again doesn't reload the list */
export function sameFilter(a: ProgressFilter, b: ProgressFilter): boolean {
  return FILTER_PARAMS.every(key => a[key] === b[key]);
}
