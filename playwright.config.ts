import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
      use: {
        // Electron launch config is handled inside each test via _electron.launch()
      },
    },
  ],
})
