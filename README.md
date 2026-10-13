# kosync-rs-web

A web UI for the admin API of [kosync-rs](../kosync-proxy), the self-hosted KOReader sync server. Built with
SolidStart, Solid, Tailwind CSS 4 and daisyUI 5.

| Page                         | What it shows                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `/` Dashboard                | Totals, the latest progress entries and the most recently active users                 |
| `/users`                     | Every account, with a name filter and sortable columns                                 |
| `/users/:id`                 | One user's history (filterable), books with their latest percentage, and devices       |
| `/progress`                  | Progress history across all users, filterable by user, book, device and time range     |
| `/books`, `/books/:document` | Documents with history, and per book who is reading it and how far along they are      |
| `/devices`                   | Devices progress was pushed from, each linking to its history                          |
| `/logs`                      | The server's live log stream, with level, target and text filters                      |

Filters live in the URL's search params, so a filtered view can be bookmarked or shared.

The admin API is read-only and has **no authentication**. This UI adds none either, so keep both on a trusted network
or behind something that authenticates.

## Configuration

The API's base URL is the only setting. It is the address of the admin listener, including its
`--admin-path-prefix` if it has one.

| Variable              | Read                       | Notes                                                               |
| --------------------- | -------------------------- | ------------------------------------------------------------------- |
| `KOSYNC_API_URL`      | When the server starts     | Preferred. One build can be pointed at any server.                  |
| `VITE_KOSYNC_API_URL` | When the app is built      | Fallback, baked into the bundle.                                    |
| *(neither)*           |                            | `/api`, which matches the same-origin proxy setup shown below.      |

```sh
KOSYNC_API_URL=http://127.0.0.1:3001 npm start
```

A `.env` file is read in development, see [.env.example](.env.example).

The browser calls the API directly, so the API must be reachable from the browser rather than from this server. If it
is on a different origin than this UI, that origin has to be listed in kosync-rs's `ADMIN_CORS_ORIGINS`.

### One origin behind a reverse proxy

Serve the UI and the API from one host and no CORS setup is needed. Start kosync-rs with `ADMIN_PATH_PREFIX=/api` and
leave `KOSYNC_API_URL` unset. In Caddy, with the UI running on port 8080:

```
example.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }
    handle {
        reverse_proxy 127.0.0.1:8080
    }
}
```

Use `handle`, not `handle_path`, so the prefix is forwarded. Log streaming needs the proxy not to buffer responses
for `/api/logs`; the server already sends `X-Accel-Buffering: no` for nginx.

## Development

Needs Node 24 or later.

```sh
# kosync-rs, allowing the dev server's origin to call the admin API
ADMIN_CORS_ORIGINS=http://localhost:5173 cargo run

# this project
npm install
KOSYNC_API_URL=http://127.0.0.1:3001 npm run dev
```

The server only streams logs that pass `RUST_LOG`, so the log page is empty at the default `info` level until
something logs. `RUST_LOG=debug` fills it quickly.

```sh
npm run typecheck   # tsc --noEmit
npm run build       # production build into .output
npm start           # run the build
```

## Docker

```sh
docker build -t kosync-rs-web .
docker run -d -p 8080:8080 -e KOSYNC_API_URL=http://localhost:3001 kosync-rs-web
```

`KOSYNC_API_URL` is read when the container starts. The URL is used by your browser, so `localhost` means your own
machine, not the container.

## The API client

`src/client` is generated from kosync-rs's OpenAPI document and committed, so builds don't need the generator. Don't
edit it by hand. After the server's API changes:

```sh
kosync-proxy --print-openapi > openapi.json
npm run generate:api
```

The generator is pinned to the version `docs/admin-client.md` in kosync-rs was written against, and needs
TypeScript 5.x (TypeScript 7 does not work with it).

## How it works

- **Rendering.** The app is a single-page app (`ssr: false`). The Node server only serves the document shell and
  injects `KOSYNC_API_URL` into it on every request.
- **Progress history** is paged with the API's cursor, 100 entries at a time. Paging is keyed on the entry id, so the
  list does not shift while new progress arrives.
- **Logs.** The stream is opened while the logs page is open and picks up where it left off, using the last event id,
  when you come back. The newest 5000 lines are kept. A marker is shown where lines were skipped because the browser
  fell behind, and where the server restarted. A clean close, which is what the server does when it shuts down, is
  reconnected after two seconds.
