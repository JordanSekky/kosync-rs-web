import type { BookResponse, ProgressEntryResponse } from "~/client";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60]
];

/** Timestamps arrive with nanosecond precision and `Date` keeps the milliseconds */
export function parseTime(iso: string): Date {
  return new Date(iso);
}

export function formatDateTime(iso: string): string {
  return parseTime(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((parseTime(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === "minute") return relative.format(Math.round(seconds / size), unit);
  }
  return formatDateTime(iso);
}

/** `HH:MM:SS.mmm` in the local time zone, for log lines */
export function formatClock(iso: string): string {
  const d = parseTime(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** `percentage` is a fraction between 0 and 1 */
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function shortHash(document: string): string {
  return document.slice(0, 8);
}

type Titled = Pick<BookResponse | ProgressEntryResponse, "title" | "filename" | "document">;

export function bookLabel(book: Titled): string {
  return book.title || book.filename || shortHash(book.document);
}

/** Value for a `datetime-local` input from an ISO timestamp, in local time */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** ISO timestamp from a `datetime-local` value, which is in local time */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
