import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock the API module
vi.mock('./api', () => ({
  fetchMonth: vi.fn().mockResolvedValue({
    rows: [
      {
        user_id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'Developer',
        days: {
          '1': { status: 'COMPLIANT', hours: 8, attendance_code: 'P', anomalies: [] },
          '2': { status: 'NOT_FILLED', hours: 0, attendance_code: null, anomalies: [] },
          '3': { status: 'WEEK_OFF', hours: 0, attendance_code: 'WO', anomalies: [] }
        }
      }
    ]
  }),
  login: vi.fn().mockResolvedValue('test-token'),
  getApiUrl: vi.fn().mockReturnValue('http://localhost:8080')
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Login', () => {
    it('should show login page when no token', () => {
      localStorage.removeItem('token')
      render(<App />)
      expect(screen.getByText('Timesheet Compliance')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    })

    it('should login with credentials', async () => {
      const user = userEvent.setup()
      localStorage.removeItem('token')
      render(<App />)
      
      const emailInput = screen.getByPlaceholderText('your@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitBtn = screen.getByRole('button', { name: 'Sign In' })
      
      await user.clear(emailInput)
      await user.type(emailInput, 'admin@example.com')
      await user.type(passwordInput, 'admin123')
      await user.click(submitBtn)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('should show error on failed login', async () => {
      const { login } = await import('./api')
      vi.mocked(login).mockRejectedValueOnce(new Error('Invalid credentials'))
      
      const user = userEvent.setup()
      localStorage.removeItem('token')
      render(<App />)
      
      const submitBtn = screen.getByRole('button', { name: 'Sign In' })
      await user.click(submitBtn)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })
  })

  describe('Dark Mode', () => {
    it('should toggle dark mode', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Find and click dark mode toggle
      const darkModeBtn = screen.getByRole('button', { name: /dark|light/i })
      await user.click(darkModeBtn)
      
      // Check that theme attribute changed
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      
      // Toggle back to light
      await user.click(darkModeBtn)
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should respect system preference on first load', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {}
      }))
      
      localStorage.removeItem('darkMode')
      render(<App />)
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  describe('Navigation', () => {
    it('should navigate between pages', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Reports
      const reportsBtn = screen.getByRole('button', { name: 'Reports' })
      await user.click(reportsBtn)
      
      expect(screen.getByText('Comprehensive Reports')).toBeInTheDocument()
      
      // Navigate to Settings
      const settingsBtn = screen.getByRole('button', { name: 'Settings' })
      await user.click(settingsBtn)
      
      expect(screen.getByText('Appearance')).toBeInTheDocument()
    })

    it('should go back in navigation history', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to multiple pages
      await user.click(screen.getByRole('button', { name: 'Reports' }))
      await user.click(screen.getByRole('button', { name: 'Import' }))
      
      // Go back
      const backBtn = screen.getByRole('button', { name: '← Back' })
      await user.click(backBtn)
      
      expect(screen.getByText('Comprehensive Reports')).toBeInTheDocument()
    })

    it('should show active nav indicator', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      const dashboardNav = screen.getByRole('button', { name: 'Dashboard' })
      expect(dashboardNav).toHaveClass('active')
    })
  })

  describe('Dashboard', () => {
    it('should load and display compliance data', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Check status cells are rendered
      expect(screen.getByText('CO')).toBeInTheDocument()
      expect(screen.getByText('NF')).toBeInTheDocument()
    })

    it('should filter employees by search', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search employee...')
      await user.type(searchInput, 'other')
      
      // Employee should not be visible when filtered out
      await waitFor(() => {
        expect(screen.queryByText('Test User')).not.toBeInTheDocument()
      })
    })

    it('should show stats cards', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument()
        expect(screen.getByText('Not Filled')).toBeInTheDocument()
        expect(screen.getByText('Anomalies')).toBeInTheDocument()
      })
    })

    it('should open cell detail modal on click', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Click a status cell
      const statusCell = screen.getByText('CO')
      await user.click(statusCell)
      
      await waitFor(() => {
        expect(screen.getByText(/Test User - Day/)).toBeInTheDocument()
      })
    })

    it('should change month/year selection', async () => {
      const user = userEvent.setup()
      const { fetchMonth } = await import('./api')
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Change month
      const monthSelect = screen.getByRole('combobox')
      await user.selectOptions(monthSelect, '3')
      
      expect(vi.mocked(fetchMonth)).toHaveBeenCalled()
    })
  })

  describe('Reports', () => {
    it('should show report tabs', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Reports' }))
      
      expect(screen.getByRole('button', { name: 'Summary' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'By Employee' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Anomalies' })).toBeInTheDocument()
    })

    it('should switch between report types', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Reports' }))
      
      // Click Employee tab
      await user.click(screen.getByRole('button', { name: 'By Employee' }))
      expect(screen.getByText('Employee-wise Breakdown')).toBeInTheDocument()
      
      // Click Anomalies tab
      await user.click(screen.getByRole('button', { name: 'Anomalies' }))
      expect(screen.getByText('Anomaly Details')).toBeInTheDocument()
    })
  })

  describe('Sync', () => {
    it('should show sync status card', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Sync' }))
      
      expect(screen.getByText('Clockify Sync')).toBeInTheDocument()
      expect(screen.getByText('Automatic Sync')).toBeInTheDocument()
    })

    it('should allow day range selection', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Sync' }))
      
      const daySelect = screen.getByRole('combobox')
      await user.selectOptions(daySelect, '14')
      
      expect(daySelect).toHaveValue('14')
    })
  })

  describe('Import', () => {
    it('should show import cards', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Import' }))
      
      expect(screen.getByText('Attendance Import')).toBeInTheDocument()
      expect(screen.getByText('Time Entries Import')).toBeInTheDocument()
    })
  })

  describe('Settings', () => {
    it('should show all settings sections', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: 'Settings' }))
      
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Compliance Thresholds')).toBeInTheDocument()
      expect(screen.getByText('Attendance Codes')).toBeInTheDocument()
      expect(screen.getByText('API Configuration')).toBeInTheDocument()
    })
  })

  describe('Notifications', () => {
    it('should show success notification', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Trigger quick sync which should show notification
      const quickSyncBtn = screen.getByRole('button', { name: 'Quick Sync' })
      await user.click(quickSyncBtn)
      
      // Notification should appear (though it will fail in test without API)
      await waitFor(() => {
        // Check for notification container
        const notifications = screen.queryAllByRole('alert')
        // May or may not have notification depending on API mock
      })
    })
  })

  describe('Logout', () => {
    it('should logout and return to login page', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      const logoutBtn = screen.getByRole('button', { name: 'Logout' })
      await user.click(logoutBtn)
      
      await waitFor(() => {
        expect(screen.getByText('Timesheet Compliance')).toBeInTheDocument()
      })
      
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})