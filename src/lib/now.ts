import { createRoot, createSignal } from "solid-js";

const TICK_MS = 30_000;

const now = createRoot(() => {
  const [now, setNow] = createSignal(Date.now());
  if (typeof window !== "undefined") setInterval(() => setNow(Date.now()), TICK_MS);
  return now;
});

/** Shared clock that ticks every 30 seconds, so relative times stay fresh */
export const useNow = () => now;
