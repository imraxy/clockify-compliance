import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => {
    const store: Record<string, string> = {
      token: 'test-token',
      darkMode: 'false',
      lastPage: 'dashboard',
      clockify_last_sync: '2026-04-10 12:00'
    }
    return store[key] || null
  },
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {}
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

// Mock matchMedia
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
    dispatchEvent: () => {}
  })
})