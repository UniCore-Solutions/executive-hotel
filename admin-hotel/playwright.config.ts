import { defineConfig } from '@playwright/test';

const PORT = process.env.PORT || 3102;

// Admin-hotel already runs as a long-lived Docker service on this port in
// this environment (docker-compose --profile backoffice up -d admin), and
// it talks to the real backend + real Postgres — there is no mock mode.
// `reuseExistingServer: true` targets that running container instead of
// spinning up a second instance; if nothing is listening on the port,
// Playwright falls back to `npm run build && npm run start`, which still
// needs the same env vars (API_INTERNAL_URL, JWT_SECRET, ...) docker-compose
// provides.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
