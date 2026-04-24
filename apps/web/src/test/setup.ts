import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

function defaultStore(): Map<string, string> {
  return new Map<string, string>([
    ['token', 'test-token'],
    ['darkMode', 'false'],
    ['lastPage', 'dashboard'],
    ['clockify_last_sync', '2026-04-10 12:00'],
  ])
}

let store = defaultStore()

const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => {
    store.clear()
  },
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL | Request) => {
    let url: string
    if (typeof input === 'string') url = input
    else if (typeof Request !== 'undefined' && input instanceof Request) url = input.url
    else url = String(input)
    if (url.includes('/api/v1/auth/me')) {
      return new Response(
        JSON.stringify({
          id: 1,
          email: 'reviewer@example.com',
          full_name: 'Reviewer User',
          role: 'reviewer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/api/v1/sync/clockify')) {
      return new Response(JSON.stringify({ imported_entries: 0, errors: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }) as unknown as typeof fetch
}

globalThis.fetch = createFetchMock()

beforeEach(() => {
  store = defaultStore()
  globalThis.fetch = createFetchMock()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})
