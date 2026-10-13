import { Show } from "solid-js";
import { formatDateTime, relativeTime } from "~/lib/format";
import { useNow } from "~/lib/now";

/** Relative time that keeps itself fresh, with the exact time on hover */
export default function Time(props: { iso: string | null | undefined; fallback?: string }) {
  const now = useNow();
  return (
    <Show when={props.iso} fallback={<span class="text-base-content/50">{props.fallback ?? "never"}</span>}>
      {iso => (
        <time dateTime={iso()} title={formatDateTime(iso())}>
          {relativeTime(iso(), now())}
        </time>
      )}
    </Show>
  );
}
