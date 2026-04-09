import { test, expect } from '@playwright/test'

test('API health', async ({ request }) => {
  const r = await request.get('/health')
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  expect(body.status).toBe('ok')
})

test('API login with seed reviewer', async ({ request }) => {
  const r = await request.post('/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'reviewer@example.com', password: 'reviewer123' }),
  })
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  expect(body.access_token).toBeTruthy()
})
