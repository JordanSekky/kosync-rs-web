// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

// Read on every request rather than at build time, so one build can be pointed
// at any server. `<` is escaped so a value can never close the script tag.
const clientConfig = () =>
  JSON.stringify({ apiUrl: process.env.KOSYNC_API_URL ?? "" }).replace(/</g, "\\u003c");

// Sets the theme before first paint so a dark preference doesn't flash light
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <script innerHTML={`window.__KOSYNC_CONFIG__=${clientConfig()}`} />
          <script innerHTML={themeScript} />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
