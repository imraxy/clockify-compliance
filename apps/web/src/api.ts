const API = import.meta.env.VITE_API_URL || 'https://clockify.sublimitysoft.in'

export function getApiUrl(): string {
  return API
}

export async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.detail || 'Login failed')
  }
  const data = await r.json()
  return data.access_token
}

export interface ComplianceMonth {
  year: number
  month: number
  rows: Array<{
    user_id: number
    email: string
    full_name: string
    role: string
    days: Record<string, {
      date: string
      status: string
      hours: number
      anomalies: string[]
      attendance_code: string | null
    }>
  }>
  thresholds: {
    approved_min_hours: number
    anomaly_long_day_hours: number
  }
}

export async function fetchMonth(token: string, year: number, month: number): Promise<ComplianceMonth> {
  const r = await fetch(`${API}/api/v1/compliance/month?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('Failed to load month')
  return r.json()
}