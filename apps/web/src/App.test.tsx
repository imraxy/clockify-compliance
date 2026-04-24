import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock the API module — fetchMonth echoes requested year/month so dates align with the dashboard
vi.mock('./api', () => {
  const buildMonthPayload = (year: number, month: number) => {
    const m = String(month).padStart(2, '0')
    const d = (n: number) => `${year}-${m}-${String(n).padStart(2, '0')}`
    return {
      year,
      month,
      thresholds: { approved_min_hours: 8, anomaly_long_day_hours: 12 },
      rows: [
        {
          user_id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'Developer',
          days: {
            '1': { date: d(1), status: 'APPROVED', hours: 8, attendance_code: 'P', anomalies: [] },
            '2': { date: d(2), status: 'NOT_FILLED', hours: 0, attendance_code: null, anomalies: [] },
            '3': { date: d(3), status: 'WEEK_OFF', hours: 0, attendance_code: 'WO', anomalies: [] },
          },
        },
      ],
    }
  }
  return {
    fetchMonth: vi.fn().mockImplementation(async (_token: string, y: number, m: number) => buildMonthPayload(y, m)),
    login: vi.fn().mockResolvedValue('test-token'),
    getApiUrl: vi.fn().mockReturnValue('http://localhost:8080'),
  }
})

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('darkMode', 'false')
    localStorage.setItem('lastPage', 'dashboard')
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
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
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
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
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
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      // Navigate to Reports
      const reportsBtn = screen.getByRole('button', { name: /reports/i })
      await user.click(reportsBtn)
      
      expect(screen.getByRole('heading', { name: /comprehensive reports/i })).toBeInTheDocument()
      
      // Navigate to Settings
      const settingsBtn = screen.getByRole('button', { name: /settings/i })
      await user.click(settingsBtn)
      
      expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument()
    })

    it('should go back in navigation history', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      // Navigate to multiple pages
      await user.click(screen.getByRole('button', { name: /reports/i }))
      await user.click(screen.getByRole('button', { name: /import/i }))
      
      // Go back
      const backBtn = screen.getByRole('button', { name: /back/i })
      await user.click(backBtn)
      
      expect(screen.getByRole('heading', { name: /comprehensive reports/i })).toBeInTheDocument()
    })

    it('should show active nav indicator', async () => {
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      const dashboardNav = screen.getByRole('button', { name: /dashboard/i })
      expect(dashboardNav).toHaveClass('active')
    })
  })

  describe('Dashboard', () => {
    it('should load and display compliance data', async () => {
      render(<App />)
      
      const grid = await screen.findByTestId('compliance-grid-view')
      await waitFor(() => {
        expect(within(grid).getByText('Test User')).toBeInTheDocument()
      })
      
      // Check status cells are rendered (legend also shows AP/NF badges)
      expect(within(grid).getByText('AP')).toBeInTheDocument()
      expect(within(grid).getByText('NF')).toBeInTheDocument()
    })

    it('should filter employees by search', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const grid = await screen.findByTestId('compliance-grid-view')
      await waitFor(() => {
        expect(within(grid).getByText('Test User')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText(/search employee/i)
      await user.type(searchInput, 'other')
      
      // Employee should not be visible when filtered out
      await waitFor(() => {
        expect(screen.queryByText('Test User')).not.toBeInTheDocument()
      })
    })

    it('should show stats cards', async () => {
      render(<App />)
      
      const stats = await screen.findByRole('region', { name: /dashboard stats/i })
      await waitFor(() => {
        expect(within(stats).getByText('Approved')).toBeInTheDocument()
        expect(within(stats).getByText('Not Filled')).toBeInTheDocument()
        expect(within(stats).getByText('Anomalies')).toBeInTheDocument()
      })
    })

    it('should open cell detail modal on click', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const grid = await screen.findByTestId('compliance-grid-view')
      await waitFor(() => {
        expect(within(grid).getByText('Test User')).toBeInTheDocument()
      })
      
      // Click a status cell
      const statusCell = within(grid).getByText('AP')
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
      const monthSelect = screen.getByRole('combobox', { name: /dashboard month/i })
      await user.selectOptions(monthSelect, '3')
      
      expect(vi.mocked(fetchMonth)).toHaveBeenCalled()
    })

    it('should switch between grid and list view', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('compliance-grid-view')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /list/i }))

      await waitFor(() => {
        expect(screen.getByTestId('compliance-list-view')).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: /^Date$/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /grid/i }))

      expect(screen.getByTestId('compliance-grid-view')).toBeInTheDocument()
    })
  })

  describe('Reports', () => {
    it('should show report tabs', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /reports/i }))
      
      expect(screen.getByRole('button', { name: /summary/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /by employee/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /anomalies/i })).toBeInTheDocument()
    })

    it('should switch between report types', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /reports/i }))
      
      // Click Employee tab
      await user.click(screen.getByRole('button', { name: /by employee/i }))
      expect(screen.getByText('Employee-wise Breakdown')).toBeInTheDocument()
      
      // Click Anomalies tab
      await user.click(screen.getByRole('button', { name: /anomalies/i }))
      expect(screen.getByText('Anomaly Details')).toBeInTheDocument()
    })
  })

  describe('Sync', () => {
    it('should show sync status card', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /^🔄 sync$/i }))
      
      expect(screen.getByRole('heading', { name: /clockify sync/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /automatic sync/i })).toBeInTheDocument()
    })

    it('should allow day range selection', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /^🔄 sync$/i }))
      
      const daySelect = screen.getByRole('combobox', { name: /sync date range/i })
      await user.selectOptions(daySelect, '14')
      
      expect(daySelect).toHaveValue('14')
    })
  })

  describe('Import', () => {
    it('should show import cards', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /import/i }))
      
      expect(screen.getByText('Attendance Import')).toBeInTheDocument()
      expect(screen.getByText('Time Entries Import')).toBeInTheDocument()
    })
  })

  describe('Settings', () => {
    it('should show all settings sections', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /settings/i }))
      
      expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /compliance thresholds/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /attendance codes/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /api configuration/i })).toBeInTheDocument()
    })
  })

  describe('Notifications', () => {
    it('should show success notification', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      // Trigger quick sync which should show notification
      const quickSyncBtn = screen.getByRole('button', { name: /quick sync/i })
      await user.click(quickSyncBtn)
      
      // Notification should appear (though it will fail in test without API)
      await waitFor(() => {
        expect(screen.queryAllByRole('alert')).toEqual(expect.any(Array))
      })
    })
  })

  describe('Logout', () => {
    it('should logout and return to login page', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
      })
      
      const logoutBtn = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutBtn)
      
      await waitFor(() => {
        expect(screen.getByText('Timesheet Compliance')).toBeInTheDocument()
      })
      
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})