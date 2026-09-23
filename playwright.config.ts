// Runs browser regression tests against an isolated production server and browser storage.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3100', headless: true },
  webServer: {
    command: 'npm start -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
  },
});
