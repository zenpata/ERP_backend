import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const recordingsDir = path.join(process.cwd(), 'recordings', 'test-output')

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // หมายเหตุ: `npx playwright test --reporter=list` จะแทนที่รายการ reporter ทั้งหมด — ตัว rename วิดีโอจะไม่ทำงาน
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(process.cwd(), 'recordings', 'playwright-report') }],
    ['./reporters/rename-video.ts'],
  ],
  outputDir: recordingsDir,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: {
      mode: process.env.PW_VIDEO === 'off' ? 'off' : 'on',
      size: { width: 1280, height: 720 },
    },
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium' }],
})
