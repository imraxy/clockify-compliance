import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('login form renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /timesheet compliance/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})
