import { createRoot, createSignal } from "solid-js";
import { type LogEntry, streamLogs } from "~/client";

/** The stream has no end, so the oldest lines are dropped past this */
export const MAX_LOG_ITEMS = 5000;

const RECONNECT_DELAY_MS = 2000;
const FLUSH_INTERVAL_MS = 50;

export type LogItem =
  | { kind: "entry"; key: number; entry: LogEntry }
  /** Lines the client was too slow for, or that left the server's cache while disconnected */
  | { kind: "gap"; key: number; skipped: number }
  /** The server started over, so ids count from 1 again */
  | { kind: "restart"; key: number };

export type LogStatus = "connecting" | "live" | "reconnecting";

/** The run part of an SSE event id, which is `<run>-<entry id>` */
function runOf(eventId: string | undefined): string | undefined {
  const dash = eventId?.lastIndexOf("-") ?? -1;
  return eventId && dash > 0 ? eventId.slice(0, dash) : undefined;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * The log buffer lives outside any page so it survives navigating away. The
 * connection is only open while a page is using it, and picks up where it left
 * off by sending the last event id when it comes back.
 */
function createLogStore() {
  const [items, setItems] = createSignal<LogItem[]>([]);
  const [status, setStatus] = createSignal<LogStatus>("connecting");
  const [error, setError] = createSignal<string>();
  const [paused, setPausedSignal] = createSignal(false);
  const [heldCount, setHeldCount] = createSignal(0);

  let nextKey = 1;
  let queue: LogItem[] = [];
  let held: LogItem[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  // Where the stream was, for the next connection and for spotting gaps
  let lastEventId: string | undefined;
  let lastRun: string | undefined;
  let lastId: number | undefined;

  let users = 0;
  let controller: AbortController | undefined;

  const cap = (list: LogItem[]) =>
    list.length > MAX_LOG_ITEMS ? list.slice(list.length - MAX_LOG_ITEMS) : list;

  function flush() {
    flushTimer = undefined;
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];

    if (paused()) {
      held = cap([...held, ...batch]);
      setHeldCount(held.length);
    } else {
      setItems(prev => cap([...prev, ...batch]));
    }
  }

  // Replaying the cache is hundreds of lines at once, so render them in batches
  function enqueue(item: LogItem) {
    queue.push(item);
    flushTimer ??= setTimeout(flush, FLUSH_INTERVAL_MS);
  }

  function receive(entry: LogEntry, run: string | undefined) {
    if (lastId !== undefined) {
      if (run !== lastRun || entry.id <= lastId) {
        enqueue({ kind: "restart", key: nextKey++ });
      } else if (entry.id > lastId + 1) {
        enqueue({ kind: "gap", key: nextKey++, skipped: entry.id - lastId - 1 });
      }
    }
    lastRun = run;
    lastId = entry.id;
    enqueue({ kind: "entry", key: nextKey++, entry });
  }

  async function follow(signal: AbortSignal) {
    let everConnected = false;

    while (!signal.aborted) {
      setStatus(everConnected ? "reconnecting" : "connecting");

      const { stream } = await streamLogs({
        signal,
        headers: lastEventId ? { "Last-Event-ID": lastEventId } : undefined,
        // The response arriving is what tells us we are connected, which an idle
        // server would otherwise not do until its first keep-alive
        fetch: async (...args) => {
          const response = await globalThis.fetch(...args);
          if (response.ok) {
            everConnected = true;
            setStatus("live");
            setError(undefined);
          }
          return response;
        },
        onSseEvent: event => {
          if (event.id) lastEventId = event.id;
        },
        onSseError: e => {
          if (signal.aborted) return;
          setStatus("reconnecting");
          setError(describe(e));
        }
      });

      for await (const entry of stream) receive(entry, runOf(lastEventId));

      // A clean end is the server shutting down, which the client does not
      // reconnect from by itself
      if (!signal.aborted) {
        setStatus("reconnecting");
        await sleep(RECONNECT_DELAY_MS);
      }
    }
  }

  function connect() {
    controller = new AbortController();
    void follow(controller.signal).catch(e => {
      setStatus("reconnecting");
      setError(describe(e));
    });
  }

  return {
    items,
    status,
    error,
    paused,
    heldCount,

    /** Opens the stream while at least one holder is registered; call the result to release */
    acquire() {
      if (users++ === 0) connect();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        if (--users === 0) {
          controller?.abort();
          controller = undefined;
        }
      };
    },

    setPaused(value: boolean) {
      if (value === paused()) return;
      flush();
      if (!value && held.length > 0) {
        const resumed = held;
        held = [];
        setHeldCount(0);
        setItems(prev => cap([...prev, ...resumed]));
      }
      setPausedSignal(value);
    },

    clear() {
      queue = [];
      held = [];
      setHeldCount(0);
      setItems([]);
    }
  };
}

export const logStore = createRoot(createLogStore);
