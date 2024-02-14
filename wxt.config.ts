import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  runner: {
    openConsole: true,
    openDevtools: true,
    startUrls: ["https://example.org"]
  }
});
