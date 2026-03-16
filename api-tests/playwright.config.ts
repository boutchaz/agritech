import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BASE_URL = process.env.API_BASE_URL || 'https://agritech-api.thebzlab.online';

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: false, // Run sequentially to avoid race conditions on shared data
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['html', { outputFolder: 'test-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    trace: 'on-first-retry',
  },

  // No webServer — we test against the deployed integration environment
});
