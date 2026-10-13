import { A } from "@solidjs/router";
import { createResource, createSignal, type JSX, onCleanup } from "solid-js";
import { health } from "~/client";
import { unwrap } from "~/lib/api";
import { apiBaseUrl } from "~/lib/config";
import Icon, { type IconName } from "./Icon";

const NAV: { href: string; label: string; icon: IconName; end?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: "home", end: true },
  { href: "/users", label: "Users", icon: "users" },
  { href: "/progress", label: "Progress", icon: "clock" },
  { href: "/books", label: "Books", icon: "book" },
  { href: "/devices", label: "Devices", icon: "device" },
  { href: "/logs", label: "Logs", icon: "terminal" }
];

const HEALTH_INTERVAL_MS = 30_000;

type Theme = "light" | "dark";

// The document shell has already set this before first paint
const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

function HealthBadge() {
  const [status, { refetch }] = createResource(() => unwrap(health()));
  const timer = setInterval(refetch, HEALTH_INTERVAL_MS);
  onCleanup(() => clearInterval(timer));

  const ok = () => status.state !== "errored" && status.latest?.status === "ok";
  const label = () => {
    if (status.state === "errored") return "Unreachable";
    return status.latest ? "Connected" : "Connecting";
  };

  return (
    <div class="tooltip tooltip-bottom" data-tip={`API at ${apiBaseUrl()}`}>
      <span class="badge badge-ghost gap-2">
        <span
          class="status"
          classList={{
            "status-success": ok(),
            "status-error": status.state === "errored",
            "status-warning": !ok() && status.state !== "errored"
          }}
        />
        {label()}
      </span>
    </div>
  );
}

export default function Layout(props: { children?: JSX.Element }) {
  const [theme, setTheme] = createSignal<Theme>(currentTheme());
  let drawer: HTMLInputElement | undefined;

  function toggleTheme() {
    const next: Theme = theme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode, the choice just isn't remembered
    }
  }

  return (
    <div class="drawer lg:drawer-open">
      <input id="nav-drawer" type="checkbox" class="drawer-toggle" ref={drawer} />

      <div class="drawer-content flex min-w-0 flex-col">
        <header class="navbar bg-base-100 border-base-300 sticky top-0 z-10 border-b">
          <div class="navbar-start">
            <label for="nav-drawer" class="btn btn-ghost btn-square lg:hidden" aria-label="Open menu">
              <Icon name="menu" />
            </label>
          </div>
          <div class="navbar-end gap-2">
            <HealthBadge />
            <button
              type="button"
              class="btn btn-ghost btn-square"
              onClick={toggleTheme}
              aria-label={theme() === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Icon name={theme() === "dark" ? "sun" : "moon"} />
            </button>
          </div>
        </header>

        <main class="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">{props.children}</main>
      </div>

      <div class="drawer-side z-20">
        <label for="nav-drawer" aria-label="Close menu" class="drawer-overlay" />
        <aside class="bg-base-200 flex min-h-full w-64 flex-col gap-2 p-4">
          <A href="/" class="px-3 py-2 text-lg font-semibold" onClick={() => drawer && (drawer.checked = false)}>
            kosync-rs
            <span class="text-base-content/60 block text-xs font-normal">admin</span>
          </A>
          <ul class="menu w-full gap-1 p-0">
            {NAV.map(item => (
              <li>
                <A
                  href={item.href}
                  end={item.end}
                  activeClass="menu-active"
                  onClick={() => drawer && (drawer.checked = false)}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </A>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
