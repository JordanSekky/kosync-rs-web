import type { Resource } from "solid-js";

/**
 * The newest value a resource has had, or undefined. Unlike reading `.latest`
 * directly, this does not throw while the resource is in an error state.
 */
export function latestOf<T>(resource: Resource<T>): T | undefined {
  return resource.state === "errored" ? undefined : resource.latest;
}
