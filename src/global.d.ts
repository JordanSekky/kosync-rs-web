/// <reference types="@solidjs/start/env" />

interface ImportMetaEnv {
  /** Fallback API base URL baked in at build time, see src/lib/config.ts */
  readonly VITE_KOSYNC_API_URL?: string;
}

// Only read by the server in entry-server.tsx
declare const process: { env: Record<string, string | undefined> };
