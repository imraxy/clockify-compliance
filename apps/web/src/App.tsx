import { useState, useEffect } from 'react';
import './App.css';
import { type ComplianceMonth, fetchMonth, login, getApiUrl } from './api';

type Page = 'dashboard' | 'import' | 'sync' | 'overrides' | 'jira' | 'settings';

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
          <button className={page === 'import' ? 'active' : ''} onClick={() => setPage('import')}>
            📥 Import Data
          </button>
          <button className={page === 'sync' ? 'active' : ''} onClick={() => setPage('sync')}>
            🔄 Clockify Sync
          </button>
          <button className={page === 'overrides' ? 'active' : ''} onClick={() => setPage('overrides')}>
            ✏️ Overrides
          </button>
          <button className={page === 'jira' ? 'active' : ''} onClick={() => setPage('jira')}>
            📋 Jira Variance
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Compliance Dashboard</h1>
        <div className="toolbar">
          <label>Year <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
          <label>Month <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></label>
          <button onClick={loadMonth} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
          <button onClick={exportExcel} className="secondary">📥 Export Excel</button>
        </div>
      </div>
      
      {data && (
        <div className="stats-row">
          <div className="stat-card"><h3>Employees</h3><p>{data.rows.length}</p></div>
          <div className="stat-card"><h3>Working Days</h3><p>{dayNumbers.length - 8}</p></div>
          <div className="stat-card"><h3>Min Hours/Day</h3><p>{data.thresholds.approved_min_hours}h</p></div>
        </div>
      )}

      {data && (
        <div className="table-container">
          <table className="compliance-grid">
            <thead>
              <tr>
                <th>Employee</th>
                {dayNumbers.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.user_id}>
                  <td className="employee-cell">{row.full_name || row.email}</td>
                  {dayNumbers.map((d) => {
                    const cell = row.days[String(d)];
                    const status = cell?.status || '—';
                    return (
                      <td key={d} className={`status-${status.toLowerCase().replace('_', '-')}`} title={cell ? `${cell.hours}h` : ''}>
                        {status.substring(0, 2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        setResult(`✅ Imported ${data.rows} attendance records`);
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
        setResult(`✅ Imported ${data.rows} time entries`);
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
      <h1>Import Data</h1>
      
      <div className="import-section">
        <h2>📥 Attendance Import</h2>
        <p>Upload Attendance.xlsx file with employee attendance codes (P, WO, EL, WFH, etc.)</p>
        <div className="upload-row">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)} />
          <button onClick={uploadAttendance} disabled={!attendanceFile || loading}>Upload Attendance</button>
        </div>
      </div>

      <div className="import-section">
        <h2>⏱️ Time Entries Import</h2>
        <p>Upload Clockify time entries CSV export</p>
        <div className="upload-row">
          <input type="file" accept=".csv" onChange={(e) => setTimeEntriesFile(e.target.files?.[0] || null)} />
          <button onClick={uploadTimeEntries} disabled={!timeEntriesFile || loading}>Upload Time Entries</button>
        </div>
      </div>

      {result && <div className="success-banner">{result}</div>}
    </div>
  );
}

function SyncPage({ token, setError }: { token: string; setError: (e: string | null) => void }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('clockify_api_key') || '');
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('clockify_workspace_id') || '');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem('clockify_last_sync'));

  function saveCredentials() {
    localStorage.setItem('clockify_api_key', apiKey);
    localStorage.setItem('clockify_workspace_id', workspaceId);
  }

  async function runSync() {
    saveCredentials();
    setSyncing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/sync/clockify`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey, workspace_id: workspaceId })
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toLocaleString();
        setLastSync(now);
        localStorage.setItem('clockify_last_sync', now);
        alert(`✅ Synced ${data.entries_count || 0} time entries`);
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
      <h1>Clockify Sync</h1>
      
      <div className="sync-info">
        <h2>How to get your Clockify credentials:</h2>
        <ol>
          <li>Go to <a href="https://clockify.me/user/settings" target="_blank" rel="noopener">Clockify Settings</a></li>
          <li>Scroll to "API" section and generate an API key</li>
          <li>Copy the API key below</li>
          <li>Find your Workspace ID in the URL when logged into Clockify (the alphanumeric string after "/workspace/")</li>
        </ol>
      </div>

      <div className="form-section">
        <label>
          API Key
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Clockify API key" />
        </label>
        <label>
          Workspace ID
          <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="e.g., 5f7b3c2d1e9a8b0001a2b3c4" />
        </label>
        <button onClick={runSync} disabled={!apiKey || !workspaceId || syncing} className="primary">
          {syncing ? 'Syncing…' : '🔄 Sync Now'}
        </button>
        {lastSync && <p className="sync-status">Last sync: {lastSync}</p>}
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
      <h1>Overrides</h1>
      <p>Manager-approved exceptions to compliance rules</p>
      
      {loading ? <p>Loading…</p> : (
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
            {overrides.length === 0 ? (
              <tr><td colSpan={4} className="empty">No overrides yet</td></tr>
            ) : (
              overrides.map((o, i) => (
                <tr key={i}>
                  <td>{o.user_email}</td>
                  <td>{o.date}</td>
                  <td>{o.reason}</td>
                  <td>{o.approved_by}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
      <h1>Jira Variance Report</h1>
      <p>Compare estimated vs actual hours from Jira</p>

      <div className="form-section">
        <label>Jira Host <input value={jiraHost} onChange={(e) => setJiraHost(e.target.value)} placeholder="yourcompany.atlassian.net" /></label>
        <label>Jira Email <input value={jiraUser} onChange={(e) => setJiraUser(e.target.value)} placeholder="you@company.com" /></label>
        <label>API Token <input type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} placeholder="Jira API token" /></label>
        <button onClick={fetchVariance} disabled={!jiraHost || !jiraUser || !jiraToken || loading}>Fetch Variance</button>
      </div>

      {variance && (
        <table className="data-table">
          <thead>
            <tr><th>Issue</th><th>Summary</th><th>Estimated</th><th>Actual</th><th>Variance</th></tr>
          </thead>
          <tbody>
            {variance.map((v, i) => (
              <tr key={i}>
                <td>{v.key}</td>
                <td>{v.summary}</td>
                <td>{v.estimated}h</td>
                <td>{v.actual}h</td>
                <td className={v.variance > 0 ? 'over' : 'under'}>{v.variance > 0 ? '+' : ''}{v.variance}h</td>
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
      <h1>Settings</h1>
      
      <div className="settings-section">
        <h2>Thresholds</h2>
        <p>Configured in <code>config/thresholds.yaml</code></p>
        <ul>
          <li>Minimum hours for approval: <strong>8h</strong></li>
          <li>Anomaly threshold: <strong>12h</strong></li>
        </ul>
      </div>

      <div className="settings-section">
        <h2>Attendance Codes</h2>
        <p>Configured in <code>config/attendance_mapping.yaml</code></p>
        <ul>
          <li><strong>P</strong> - Present</li>
          <li><strong>WO</strong> - Week Off</li>
          <li><strong>EL</strong> - Earned Leave</li>
          <li><strong>WFH</strong> - Work From Home</li>
          <li><strong>H</strong> - Holiday</li>
        </ul>
      </div>

      <div className="settings-section">
        <h2>API Endpoints</h2>
        <p>Base URL: <code>{getApiUrl()}</code></p>
        <p>API Docs: <a href={`${getApiUrl()}/docs`} target="_blank">{getApiUrl()}/docs</a></p>
      </div>
    </div>
  );
}

export default App;