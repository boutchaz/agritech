import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(__dirname, '.env.integration'),
  quiet: true,
});

const baseURL =
  process.env.INTEGRATION_BASE_URL?.replace(/\/$/, '') ??
  'https://agritech-dashboard.thebzlab.online';

/**
 * UI integration tests against a deployed dashboard (no local Vite server).
 *
 * Required env (or copy `.env.integration.example` → `.env.integration` in project root):
 * - INTEGRATION_USER_EMAIL
 * - INTEGRATION_USER_PASSWORD
 * - INTEGRATION_CALIBRATION_PARCEL_ID
 *
 * Optional:
 * - INTEGRATION_BASE_URL (default: agritech-dashboard.thebzlab.online)
 * - INTEGRATION_CALIBRATION_SUBMIT_INITIAL=true — run opt-in test that launches initial calibration (alias: INTEGRATION_CALIBRATION_SUBMIT_F1)
 */
export default defineConfig({
  testDir: './e2e/integration',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 25_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report-integration' }],
    ['list'],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },

  projects: [
    {
      name: 'integration-setup',
      testMatch: /integration-auth\.setup\.ts/,
    },
    {
      name: 'integration-calibration',
      dependencies: ['integration-setup'],
      testMatch: /calibration\.integration\.spec\.ts/,
      use: {
        storageState: path.join(__dirname, 'e2e/.auth/integration-user.json'),
      },
    },
  ],
});
