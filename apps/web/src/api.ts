const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || 'Login failed')
  }
  const data = (await r.json()) as { access_token: string }
  return data.access_token
}

export type DayCell = {
  date: string
  status: string
  hours: number
  anomalies: string[]
  attendance_code?: string | null
}

export type ComplianceRow = {
  user_id: number
  email: string
  full_name: string
  role: string
  days: Record<string, DayCell>
}

export type ComplianceMonth = {
  year: number
  month: number
  rows: ComplianceRow[]
}

export async function fetchMonth(token: string, year: number, month: number): Promise<ComplianceMonth> {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  const r = await fetch(`${API}/api/v1/compliance/month?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<ComplianceMonth>
}
