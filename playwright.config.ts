import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const skipWebServer = process.env.SKIP_WEBSERVER === "1" || process.env.SKIP_WEBSERVER === "true";
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL && !skipWebServer;

/**
 * Live smoke (preview or production) sets PLAYWRIGHT_BASE_URL and never boots a local server.
 *
 * Do not use `npm run build` here: scripts/vercel-build.mjs runs `prisma migrate deploy`.
 * Local webServer uses `npx prisma generate && npx next build && npx next start` only.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "smoke",
      testMatch: "smoke/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      testIgnore: "smoke/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: "npx prisma generate && npx next build && npx next start --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !isCI,
        timeout: 300_000,
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/ci",
        } as Record<string, string>,
      }
    : undefined,
});
