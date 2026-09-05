import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5193",
    browserName: "chromium",
    headless: true,
  },
  reporter: "list",
});
