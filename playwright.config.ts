import { defineConfig, devices } from "@playwright/test";

const e2ePort = 3100;
const e2eBaseURL = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: e2eBaseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build:web && npm run start --workspace=@nemesis/web -- -H 127.0.0.1 -p ${e2ePort}`,
    url: e2eBaseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "720ee22098d1b9ac6fa8918c49f968fa",
      SESSION_SECRET: "nemesis-e2e-session-secret-32-characters-minimum",
      DATABASE_URL: "postgres://nemesis_e2e:unused@127.0.0.1:65432/nemesis_e2e",
      NEMESIS_SKIP_DB_INIT: "1",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
