declare global {
  interface Window {
    /** Written into the document shell by the server on every request, see entry-server.tsx */
    __KOSYNC_CONFIG__?: { apiUrl?: string };
  }
}

/** Matches the same-origin reverse proxy setup in the kosync-rs README */
const DEFAULT_API_URL = "/api";

/**
 * Base URL of the kosync-rs admin API, including any `--admin-path-prefix`.
 *
 * In order: `KOSYNC_API_URL` of the running server, `VITE_KOSYNC_API_URL` from
 * the build, then `/api`.
 */
export function apiBaseUrl(): string {
  const runtime = typeof window === "undefined" ? undefined : window.__KOSYNC_CONFIG__?.apiUrl;
  const url = runtime || import.meta.env.VITE_KOSYNC_API_URL || DEFAULT_API_URL;
  // The generated client appends routes that start with a slash
  return url.trim().replace(/\/+$/, "");
}
