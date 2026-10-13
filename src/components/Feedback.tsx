import { type JSX, Match, type Resource, Show, Switch } from "solid-js";
import { ApiError } from "~/lib/api";
import { apiBaseUrl } from "~/lib/config";
import Icon from "./Icon";

export function Loading(props: { label?: string }) {
  return (
    <div class="text-base-content/60 flex items-center justify-center gap-3 py-12">
      <span class="loading loading-spinner" />
      {props.label ?? "Loading"}
    </div>
  );
}

export function EmptyState(props: { title: string; children?: JSX.Element }) {
  return (
    <div class="text-base-content/60 py-12 text-center">
      <p class="font-medium">{props.title}</p>
      {props.children && <p class="mt-1 text-sm">{props.children}</p>}
    </div>
  );
}

export function ErrorAlert(props: { error: unknown; onRetry?: () => void }) {
  const message = () =>
    props.error instanceof Error ? props.error.message : String(props.error ?? "Request failed");
  // Without a status nothing answered, which is almost always the URL or CORS
  const unreachable = () => props.error instanceof ApiError && props.error.status === undefined;

  return (
    <div role="alert" class="alert alert-error alert-soft">
      <Icon name="warning" />
      <div>
        <p class="font-medium">{message()}</p>
        <Show when={unreachable()}>
          <p class="text-sm">
            Could not reach the admin API at <code>{apiBaseUrl()}</code>. Check <code>KOSYNC_API_URL</code> and,
            if it is on another origin, the server's <code>ADMIN_CORS_ORIGINS</code>.
          </p>
        </Show>
      </div>
      <Show when={props.onRetry}>
        <button type="button" class="btn btn-sm" onClick={props.onRetry}>
          Retry
        </button>
      </Show>
    </div>
  );
}

/** Shows a resource's loading and error states, and its data once it has some */
export function Async<T>(props: {
  resource: Resource<T>;
  onRetry?: () => void;
  children: (data: T) => JSX.Element;
}) {
  return (
    <Switch>
      <Match when={props.resource.error}>
        <ErrorAlert error={props.resource.error} onRetry={props.onRetry} />
      </Match>
      <Match when={props.resource.state === "ready" || props.resource.state === "refreshing"}>
        {/* `latest` does not suspend while a refetch is in flight */}
        {props.children(props.resource.latest as T)}
      </Match>
      <Match when={true}>
        <Loading />
      </Match>
    </Switch>
  );
}
