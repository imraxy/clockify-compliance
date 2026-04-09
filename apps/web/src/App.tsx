import { useMemo, useState } from 'react'
import './App.css'
import { type ComplianceMonth, fetchMonth, login } from './api'

function App() {
  const [email, setEmail] = useState('reviewer@example.com')
  const [password, setPassword] = useState('reviewer123')
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(1)
  const [data, setData] = useState<ComplianceMonth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const dayNumbers = useMemo(() => {
    const last = new Date(year, month, 0).getDate()
    return Array.from({ length: last }, (_, i) => i + 1)
  }, [year, month])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const t = await login(email, password)
      localStorage.setItem('token', t)
      setToken(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function loadMonth() {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const m = await fetchMonth(token, year, month)
      setData(m)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setData(null)
  }

  return (
    <div className="layout">
      <header className="header">
        <h1>Timesheet compliance</h1>
        {token ? (
          <button type="button" onClick={logout}>
            Log out
          </button>
        ) : null}
      </header>

      {!token ? (
        <form className="card" onSubmit={handleLogin}>
          <h2>Sign in</h2>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="hint">Dev seed: reviewer@example.com / reviewer123</p>
        </form>
      ) : (
        <div className="card">
          <div className="toolbar">
            <label>
              Year
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              Month
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </label>
            <button type="button" onClick={loadMonth} disabled={loading}>
              {loading ? 'Loading…' : 'Load month'}
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {data ? <ComplianceTable dayNumbers={dayNumbers} data={data} /> : null}
        </div>
      )}
    </div>
  )
}

function ComplianceTable({
  dayNumbers,
  data,
}: {
  dayNumbers: number[]
  data: ComplianceMonth
}) {
  const [selected, setSelected] = useState<{ email: string; day: number; cell: unknown } | null>(null)

  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th>Employee</th>
            {dayNumbers.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.user_id}>
              <td>{row.full_name || row.email}</td>
              {dayNumbers.map((d) => {
                const cell = row.days[String(d)]
                const label = cell?.status ?? '—'
                return (
                  <td
                    key={d}
                    title={cell ? `${cell.hours}h · ${(cell.anomalies || []).join(', ')}` : ''}
                    className={`st-${(cell?.status || 'empty').toLowerCase()}`}
                    onClick={() => cell && setSelected({ email: row.email, day: d, cell })}
                    role="gridcell"
                  >
                    {label}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <aside className="drawer" data-testid="day-drawer">
          <h3>
            Day {selected.day} — {selected.email}
          </h3>
          <pre>{JSON.stringify(selected.cell, null, 2)}</pre>
          <button type="button" onClick={() => setSelected(null)}>
            Close
          </button>
        </aside>
      ) : null}
    </div>
  )
}

export default App
