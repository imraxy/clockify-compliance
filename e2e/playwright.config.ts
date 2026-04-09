import { defineConfig } from '@playwright/test'

const apiURL = process.env.API_URL ?? 'http://127.0.0.1:8000'
const webURL = process.env.WEB_URL ?? 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { baseURL: apiURL },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,
    },
  ],
})
