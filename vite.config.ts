import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";

import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  // The admin API is called from the browser, so there is nothing to render on the server
  plugins: [solidStart({ ssr: false }), nitro(), tailwindcss()]
});
