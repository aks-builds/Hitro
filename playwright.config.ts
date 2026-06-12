import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  // Serialize all spec files: every suite launches its own Electron process
  // pointing to the same user-data dir. Concurrent workers cause SQLite
  // locking between parallel Electron instances.
  workers: 1,
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
