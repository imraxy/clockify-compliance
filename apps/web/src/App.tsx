import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { type ComplianceMonth, fetchMonth, login, getApiUrl } from './api';

type Page = 'dashboard' | 'reports' | 'import' | 'sync' | 'overrides' | 'jira' | 'settings';

interface EmployeeStats {
  user_id: number;
  name: string;
  email: string;
  approvedDays: number;
  notFilledDays: number;
  halfFilledDays: number;
  weekOffDays: number;
  leaveDays: number;
  anomalyDays: number;
  totalHours: number;
  avgHours: number;
}

interface MonthStats {
  totalEmployees: number;
  totalDays: number;
  approvedPercent: number;
  notFilledPercent: number;
  anomalies: number;
  topOffenders: EmployeeStats[];
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<{ email: string; full_name: string; role: string } | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  async function fetchCurrentUser() {
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  if (!token) {
    return <LoginPage onLogin={setToken} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🕐 Clockify</h2>
          <p className="user-info">{user?.full_name || user?.email}</p>
          <span className="role-badge">{user?.role}</span>
        </div>
        <nav className="sidebar-nav">
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>
            📊 Dashboard
          </button>
          <button className={page === 'reports' ? 'active' : ''} onClick={() => setPage('reports')}>
            📈 Reports
          </button>
          <button className={page === 'import' ? 'active' : ''} onClick={() => setPage('import')}>
            📥 Import
          </button>
          <button className={page === 'sync' ? 'active' : ''} onClick={() => setPage('sync')}>
            🔄 Sync
          </button>
          <button className={page === 'overrides' ? 'active' : ''} onClick={() => setPage('overrides')}>
            ✏️ Overrides
          </button>
          <button className={page === 'jira' ? 'active' : ''} onClick={() => setPage('jira')}>
            📋 Jira
          </button>
          <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}>
            ⚙️ Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </aside>
      <main className="main-content">
        {error && <div className="error-banner">{error} <button onClick={() => setError(null)}>✕</button></div>}
        {page === 'dashboard' && <DashboardPage token={token} />}
        {page === 'reports' && <ReportsPage token={token} />}
        {page === 'import' && <ImportPage token={token} setError={setError} />}
        {page === 'sync' && <SyncPage token={token} setError={setError} />}
        {page === 'overrides' && <OverridesPage token={token} />}
        {page === 'jira' && <JiraPage token={token} />}
        {page === 'settings' && <SettingsPage token={token} />}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (t: string) => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const t = await login(email, password);
      onLogin(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>🕐 Timesheet Compliance</h1>
        <p className="subtitle">Sign in to continue</p>
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint">Demo: admin@example.com / admin123</p>
      </form>
    </div>
  );
}

function DashboardPage({ token }: { token: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<ComplianceMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ user: any; day: number } | null>(null);

  async function loadMonth() {
    setLoading(true);
    try {
      const m = await fetchMonth(token, year, month);
      setData(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  async function exportExcel() {
    const res = await fetch(`${getApiUrl()}/api/v1/compliance/month/export.xlsx?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-${year}-${month}.xlsx`;
      a.click();
    }
  }

  const dayNumbers = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(row => 
      row.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      row.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const stats = useMemo(() => {
    if (!data) return null;
    let approved = 0, notFilled = 0, halfFilled = 0, weekOff = 0, leave = 0, anomalies = 0, totalHours = 0;
    data.rows.forEach(row => {
      Object.values(row.days).forEach((cell: any) => {
        totalHours += cell.hours || 0;
        switch (cell.status) {
          case 'COMPLIANT': approved++; break;
          case 'NOT_FILLED': notFilled++; break;
          case 'HALF_FILLED': halfFilled++; break;
          case 'WEEK_OFF': weekOff++; break;
          case 'LEAVE': leave++; break;
        }
        anomalies += cell.anomalies?.length || 0;
      });
    });
    const totalCells = data.rows.length * dayNumbers.length;
    return { approved, notFilled, halfFilled, weekOff, leave, anomalies, totalHours, totalCells };
  }, [data, dayNumbers]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 Compliance Dashboard</h1>
        <div className="toolbar">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(year, m-1).toLocaleDateString('en', {month: 'long'})}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input 
            type="search" 
            placeholder="🔍 Search employee..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button onClick={exportExcel} className="secondary">📥 Export Excel</button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card approved"><span className="stat-icon">✅</span><h3>Approved</h3><p>{stats.approved}</p><small>{Math.round(stats.approved/stats.totalCells*100)}%</small></div>
          <div className="stat-card warning"><span className="stat-icon">⚠️</span><h3>Not Filled</h3><p>{stats.notFilled}</p><small>{Math.round(stats.notFilled/stats.totalCells*100)}%</small></div>
          <div className="stat-card info"><span className="stat-icon">🏖️</span><h3>Week Off</h3><p>{stats.weekOff}</p></div>
          <div className="stat-card leave"><span className="stat-icon">📅</span><h3>Leave</h3><p>{stats.leave}</p></div>
          <div className="stat-card danger"><span className="stat-icon">🚨</span><h3>Anomalies</h3><p>{stats.anomalies}</p></div>
          <div className="stat-card hours"><span className="stat-icon">⏱️</span><h3>Total Hours</h3><p>{Math.round(stats.totalHours)}h</p></div>
        </div>
      )}

      {loading ? <div className="loading">Loading...</div> : data && (
        <div className="table-container">
          <div className="legend">
            <span className="legend-item"><span className="badge compliant">CO</span> Compliant</span>
            <span className="legend-item"><span className="badge not-filled">NF</span> Not Filled</span>
            <span className="legend-item"><span className="badge half-filled">HF</span> Half Filled</span>
            <span className="legend-item"><span className="badge week-off">WO</span> Week Off</span>
            <span className="legend-item"><span className="badge leave">LV</span> Leave</span>
            <span className="legend-item"><span className="badge anomaly">!</span> Anomaly</span>
          </div>
          <table className="compliance-grid">
            <thead>
              <tr>
                <th>Employee</th>
                {dayNumbers.map((d) => {
                  const day = new Date(year, month - 1, d);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return <th key={d} className={isWeekend ? 'weekend-header' : ''}>{d}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.user_id}>
                  <td className="employee-cell">
                    <span className="employee-name">{row.full_name || row.email}</span>
                    <span className="employee-role">{row.role}</span>
                  </td>
                  {dayNumbers.map((d) => {
                    const cell = row.days[String(d)];
                    const status = cell?.status || '—';
                    const hasAnomaly = cell?.anomalies?.length > 0;
                    return (
                      <td 
                        key={d} 
                        className={`status-cell status-${status.toLowerCase().replace('_', '-')} ${hasAnomaly ? 'has-anomaly' : ''}`}
                        onClick={() => setSelectedCell({ user: row, day: d })}
                        title={cell ? `${status} - ${cell.hours}h${hasAnomaly ? ' - Anomaly!' : ''}` : ''}
                      >
                        {status.substring(0, 2)}
                        {hasAnomaly && <span className="anomaly-marker">!</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCell && (
        <div className="cell-detail-modal" onClick={() => setSelectedCell(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedCell.user.full_name} - Day {selectedCell.day}</h3>
            {selectedCell.user.days[selectedCell.day] && (
              <div className="detail-info">
                <p><strong>Status:</strong> {selectedCell.user.days[selectedCell.day].status}</p>
                <p><strong>Hours:</strong> {selectedCell.user.days[selectedCell.day].hours}h</p>
                <p><strong>Attendance:</strong> {selectedCell.user.days[selectedCell.day].attendance_code || '—'}</p>
                {selectedCell.user.days[selectedCell.day].anomalies?.length > 0 && (
                  <div className="anomalies-list">
                    <strong>Anomalies:</strong>
                    <ul>{selectedCell.user.days[selectedCell.day].anomalies.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setSelectedCell(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ token }: { token: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<ComplianceMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'employee' | 'anomalies'>('summary');

  async function loadMonth() {
    setLoading(true);
    try {
      const m = await fetchMonth(token, year, month);
      setData(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  const dayNumbers = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);

  const employeeStats = useMemo(() => {
    if (!data) return [];
    return data.rows.map(row => {
      let approved = 0, notFilled = 0, halfFilled = 0, weekOff = 0, leave = 0, anomalyDays = 0, totalHours = 0;
      Object.values(row.days).forEach((cell: any) => {
        totalHours += cell.hours || 0;
        switch (cell.status) {
          case 'COMPLIANT': approved++; break;
          case 'NOT_FILLED': notFilled++; break;
          case 'HALF_FILLED': halfFilled++; break;
          case 'WEEK_OFF': weekOff++; break;
          case 'LEAVE': leave++; break;
        }
        if (cell.anomalies?.length > 0) anomalyDays++;
      });
      const avgHours = approved > 0 ? totalHours / approved : 0;
      return { user_id: row.user_id, name: row.full_name || row.email, email: row.email, role: row.role, approvedDays: approved, notFilledDays: notFilled, halfFilledDays: halfFilled, weekOffDays: weekOff, leaveDays: leave, anomalyDays, totalHours: Math.round(totalHours), avgHours: Math.round(avgHours * 10) / 10 };
    }).sort((a, b) => b.notFilledDays - a.notFilledDays);
  }, [data]);

  const monthStats = useMemo(() => {
    if (!employeeStats.length) return null;
    const total = employeeStats.reduce((s, e) => s + e.notFilledDays, 0);
    const anomalies = employeeStats.reduce((s, e) => s + e.anomalyDays, 0);
    const approved = employeeStats.reduce((s, e) => s + e.approvedDays, 0);
    const totalCells = employeeStats.length * dayNumbers.length;
    return {
      totalEmployees: employeeStats.length,
      totalDays: dayNumbers.length,
      approvedPercent: Math.round(approved / totalCells * 100),
      notFilledPercent: Math.round(total / totalCells * 100),
      anomalies,
      topOffenders: employeeStats.filter(e => e.notFilledDays > 5).slice(0, 10)
    };
  }, [employeeStats, dayNumbers]);

  const anomalyList = useMemo(() => {
    if (!data) return [];
    const anomalies: { user: string; day: number; anomaly: string; hours: number }[] = [];
    data.rows.forEach(row => {
      Object.entries(row.days).forEach(([day, cell]: [string, any]) => {
        if (cell.anomalies?.length > 0) {
          anomalies.push({
            user: row.full_name || row.email,
            day: Number(day),
            anomaly: cell.anomalies.join(', '),
            hours: cell.hours
          });
        }
      });
    });
    return anomalies;
  }, [data]);

  async function exportDigest() {
    const res = await fetch(`${getApiUrl()}/api/v1/compliance/month/digest.txt?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-digest-${year}-${month}.txt`;
      a.click();
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📈 Comprehensive Reports</h1>
        <div className="toolbar">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(year, m-1).toLocaleDateString('en', {month: 'long'})}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportDigest} className="secondary">📄 Export Digest</button>
        </div>
      </div>

      <div className="report-tabs">
        <button className={reportType === 'summary' ? 'active' : ''} onClick={() => setReportType('summary')}>📊 Summary</button>
        <button className={reportType === 'employee' ? 'active' : ''} onClick={() => setReportType('employee')}>👥 By Employee</button>
        <button className={reportType === 'anomalies' ? 'active' : ''} onClick={() => setReportType('anomalies')}>🚨 Anomalies</button>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <>
          {reportType === 'summary' && monthStats && (
            <div className="report-summary">
              <div className="summary-grid">
                <div className="summary-card"><h3>Total Employees</h3><p className="big-num">{monthStats.totalEmployees}</p></div>
                <div className="summary-card"><h3>Working Days</h3><p className="big-num">{monthStats.totalDays}</p></div>
                <div className="summary-card success"><h3>Approved Rate</h3><p className="big-num">{monthStats.approvedPercent}%</p></div>
                <div className="summary-card warning"><h3>Not Filled Rate</h3><p className="big-num">{monthStats.notFilledPercent}%</p></div>
                <div className="summary-card danger"><h3>Total Anomalies</h3><p className="big-num">{monthStats.anomalies}</p></div>
              </div>

              {monthStats.topOffenders.length > 0 && (
                <div className="top-offenders">
                  <h3>⚠️ Top Employees with Missing Timesheets</h3>
                  <table className="data-table">
                    <thead><tr><th>Employee</th><th>Not Filled Days</th><th>Approved Days</th><th>Total Hours</th></tr></thead>
                    <tbody>
                      {monthStats.topOffenders.map(e => (
                        <tr key={e.user_id}>
                          <td>{e.name}</td>
                          <td className="danger">{e.notFilledDays}</td>
                          <td>{e.approvedDays}</td>
                          <td>{e.totalHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportType === 'employee' && (
            <div className="employee-report">
              <h3>Employee-wise Breakdown</h3>
              <table className="data-table sortable">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>✅ Approved</th>
                    <th>⚠️ Not Filled</th>
                    <th>📊 Half Filled</th>
                    <th>🏖️ Week Off</th>
                    <th>📅 Leave</th>
                    <th>🚨 Anomalies</th>
                    <th>⏱️ Total Hours</th>
                    <th>📈 Avg Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats.map(e => (
                    <tr key={e.user_id} className={e.notFilledDays > 5 ? 'row-warning' : ''}>
                      <td>{e.name}</td>
                      <td>{e.role}</td>
                      <td className="success">{e.approvedDays}</td>
                      <td className={e.notFilledDays > 5 ? 'danger' : ''}>{e.notFilledDays}</td>
                      <td>{e.halfFilledDays}</td>
                      <td>{e.weekOffDays}</td>
                      <td>{e.leaveDays}</td>
                      <td className={e.anomalyDays > 0 ? 'warning' : ''}>{e.anomalyDays}</td>
                      <td>{e.totalHours}h</td>
                      <td>{e.avgHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'anomalies' && (
            <div className="anomaly-report">
              <h3>Anomaly Details</h3>
              {anomalyList.length === 0 ? (
                <div className="empty-state">✅ No anomalies detected this month!</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Day</th><th>Anomaly</th><th>Hours Logged</th></tr></thead>
                  <tbody>
                    {anomalyList.map((a, i) => (
                      <tr key={i}>
                        <td>{a.user}</td>
                        <td>Day {a.day}</td>
                        <td className="anomaly-text">{a.anomaly}</td>
                        <td>{a.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ImportPage({ token, setError }: { token: string; setError: (e: string | null) => void }) {
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [timeEntriesFile, setTimeEntriesFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function uploadAttendance() {
    if (!attendanceFile) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', attendanceFile);
      const res = await fetch(`${getApiUrl()}/api/v1/import/attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✅ Imported ${data.rows} attendance records${data.errors?.length ? ` (${data.errors.length} errors)` : ''}`);
      } else {
        setError(data.detail || 'Import failed');
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function uploadTimeEntries() {
    if (!timeEntriesFile) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', timeEntriesFile);
      const res = await fetch(`${getApiUrl()}/api/v1/import/time-entries`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✅ Imported ${data.imported || data.rows} time entries`);
      } else {
        setError(data.detail || 'Import failed');
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>📥 Import Data</h1>
      
      <div className="import-cards">
        <div className="import-card">
          <div className="import-icon">📋</div>
          <h2>Attendance Import</h2>
          <p>Upload Attendance.xlsx with employee attendance codes (P, WO, EL, WFH, HD, etc.)</p>
          <div className="upload-row">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)} />
            <button onClick={uploadAttendance} disabled={!attendanceFile || loading} className="primary">
              {loading ? '⏳ Uploading...' : '📤 Upload Attendance'}
            </button>
          </div>
        </div>

        <div className="import-card">
          <div className="import-icon">⏱️</div>
          <h2>Time Entries Import</h2>
          <p>Upload Clockify time entries CSV export</p>
          <div className="upload-row">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setTimeEntriesFile(e.target.files?.[0] || null)} />
            <button onClick={uploadTimeEntries} disabled={!timeEntriesFile || loading} className="primary">
              {loading ? '⏳ Uploading...' : '📤 Upload Time Entries'}
            </button>
          </div>
        </div>
      </div>

      {result && <div className="success-banner">{result}</div>}
    </div>
  );
}

function SyncPage({ token, setError }: { token: string; setError: (e: string | null) => void }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem('clockify_last_sync'));
  const [syncResult, setSyncResult] = useState<{ entries: number; errors: string[] } | null>(null);

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      const res = await fetch(`${getApiUrl()}/api/v1/sync/clockify`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          start: startDate.toISOString().split('T')[0] + 'T00:00:00',
          end: endDate.toISOString().split('T')[0] + 'T23:59:59'
        })
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toLocaleString();
        setLastSync(now);
        localStorage.setItem('clockify_last_sync', now);
        setSyncResult({ entries: data.imported_entries || 0, errors: data.errors || [] });
      } else {
        setError(data.detail || 'Sync failed');
      }
    } catch (err) {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page">
      <h1>🔄 Clockify Sync</h1>
      
      <div className="sync-status-card">
        <div className="sync-info">
          <h2>Automatic Sync</h2>
          <p>✅ Daily sync runs automatically at midnight (5:30 AM IST)</p>
          {lastSync && <p className="last-sync">Last sync: {lastSync}</p>}
        </div>
        <div className="sync-actions">
          <button onClick={runSync} disabled={syncing} className="primary large">
            {syncing ? '⏳ Syncing...' : '🔄 Sync Now (Last 7 Days)'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="sync-result">
          <h3>✅ Sync Complete</h3>
          <p><strong>Entries imported:</strong> {syncResult.entries}</p>
          {syncResult.errors.length > 0 && (
            <div className="sync-errors">
              <strong>Errors:</strong>
              <ul>{syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="sync-help">
        <h3>ℹ️ How it works</h3>
        <ul>
          <li>API credentials are pre-configured in the server</li>
          <li>Manual sync pulls last 7 days of time entries</li>
          <li>Automatic sync runs daily to keep data fresh</li>
        </ul>
      </div>
    </div>
  );
}

function OverridesPage({ token }: { token: string }) {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverrides();
  }, []);

  async function fetchOverrides() {
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/overrides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>✏️ Overrides</h1>
      <p>Manager-approved exceptions to compliance rules</p>
      
      {loading ? <div className="loading">Loading...</div> : (
        <div className="overrides-container">
          {overrides.length === 0 ? (
            <div className="empty-state">
              <p>No overrides configured yet</p>
              <p className="hint">Overrides allow managers to approve exceptions like extra hours, weekend work, or missed entries</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o, i) => (
                  <tr key={i}>
                    <td>{o.user_email}</td>
                    <td>{o.date}</td>
                    <td>{o.reason}</td>
                    <td>{o.approved_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function JiraPage({ token }: { token: string }) {
  const [jiraHost, setJiraHost] = useState('');
  const [jiraUser, setJiraUser] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [variance, setVariance] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchVariance() {
    if (!jiraHost || !jiraUser || !jiraToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/jira/variance?jira_host=${encodeURIComponent(jiraHost)}&jira_user=${encodeURIComponent(jiraUser)}&jira_token=${encodeURIComponent(jiraToken)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVariance(data.issues || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>📋 Jira Variance Report</h1>
      <p>Compare estimated vs actual hours from Jira issues</p>

      <div className="form-card">
        <h3>Connect to Jira</h3>
        <div className="form-grid">
          <label>Jira Host <input value={jiraHost} onChange={(e) => setJiraHost(e.target.value)} placeholder="yourcompany.atlassian.net" /></label>
          <label>Jira Email <input value={jiraUser} onChange={(e) => setJiraUser(e.target.value)} placeholder="you@company.com" /></label>
          <label>API Token <input type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} placeholder="Jira API token" /></label>
        </div>
        <button onClick={fetchVariance} disabled={!jiraHost || !jiraUser || !jiraToken || loading} className="primary">
          {loading ? '⏳ Fetching...' : '📊 Fetch Variance'}
        </button>
      </div>

      {variance && (
        <table className="data-table">
          <thead>
            <tr><th>Issue</th><th>Summary</th><th>Estimated</th><th>Actual</th><th>Variance</th></tr>
          </thead>
          <tbody>
            {variance.map((v, i) => (
              <tr key={i}>
                <td><a href={`https://${jiraHost}/browse/${v.key}`} target="_blank">{v.key}</a></td>
                <td>{v.summary}</td>
                <td>{v.estimated}h</td>
                <td>{v.actual}h</td>
                <td className={v.variance > 0 ? 'danger' : 'success'}>{v.variance > 0 ? '+' : ''}{v.variance}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SettingsPage({ token }: { token: string }) {
  return (
    <div className="page">
      <h1>⚙️ Settings</h1>
      
      <div className="settings-grid">
        <div className="settings-card">
          <h2>📊 Compliance Thresholds</h2>
          <p>Configured in <code>config/thresholds.yaml</code></p>
          <ul className="settings-list">
            <li><strong>Minimum hours for approval:</strong> 8 hours/day</li>
            <li><strong>Anomaly threshold:</strong> 12 hours/day (flagged as overwork)</li>
          </ul>
        </div>

        <div className="settings-card">
          <h2>📋 Attendance Codes</h2>
          <p>Configured in <code>config/attendance_mapping.yaml</code></p>
          <div className="code-list">
            <span className="code-badge present">P - Present</span>
            <span className="code-badge wfh">WFH - Work From Home</span>
            <span className="code-badge woff">WO - Week Off</span>
            <span className="code-badge leave">EL - Earned Leave</span>
            <span className="code-badge leave">HD - Half Day</span>
            <span className="code-badge leave">SL - Sick Leave</span>
          </div>
        </div>

        <div className="settings-card">
          <h2>🔗 API Configuration</h2>
          <p>Base URL: <code>{getApiUrl()}</code></p>
          <p>API Docs: <a href={`${getApiUrl()}/docs`} target="_blank">OpenAPI Documentation</a></p>
          <p>Health Check: <a href={`${getApiUrl()}/api/v1/health`} target="_blank">System Status</a></p>
        </div>

        <div className="settings-card">
          <h2>🔄 Sync Schedule</h2>
          <p>Automatic sync runs daily at midnight (5:30 AM IST)</p>
          <p>Clockify workspace is pre-configured</p>
        </div>
      </div>
    </div>
  );
}

export default App;