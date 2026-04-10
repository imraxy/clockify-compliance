import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { type ComplianceMonth, fetchMonth, login, getApiUrl } from './api';

type Page = 'dashboard' | 'reports' | 'import' | 'sync' | 'overrides' | 'jira' | 'settings';

// Dark mode context
function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return { darkMode, toggleDarkMode: () => setDarkMode(!darkMode) };
}

interface EmployeeStats {
  user_id: number;
  name: string;
  email: string;
  role: string;
  approvedDays: number;
  notFilledDays: number;
  halfFilledDays: number;
  weekOffDays: number;
  leaveDays: number;
  anomalyDays: number;
  totalHours: number;
  avgHours: number;
}

interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<{ email: string; full_name: string; role: string } | null>(null);
  const [page, setPage] = useState<Page>(() => localStorage.getItem('lastPage') as Page || 'dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { darkMode, toggleDarkMode } = useDarkMode();

  // Navigation history
  const [navHistory, setNavHistory] = useState<Page[]>(['dashboard']);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('lastPage', page);
    setNavHistory(prev => prev[prev.length - 1] !== page ? [...prev.slice(-3), page] : prev);
  }, [page]);

  function addNotification(type: 'success' | 'error' | 'info', message: string) {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }

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

  function goBack() {
    if (navHistory.length > 1) {
      const newHistory = navHistory.slice(0, -1);
      setNavHistory(newHistory);
      setPage(newHistory[newHistory.length - 1]);
    }
  }

  if (!token) {
    return <LoginPage onLogin={setToken} addNotification={addNotification} />;
  }

  return (
    <div className="app-layout" data-theme={darkMode ? 'dark' : 'light'}>
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification notification-${n.type}`} onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>
            <span className="notification-icon">
              {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">🕐</span>
            <span className="brand-name">Clockify</span>
          </div>
          <div className="user-profile">
            <div className="avatar">{user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}</div>
            <div className="user-details">
              <span className="user-name">{user?.full_name || 'User'}</span>
              <span className="role-badge">{user?.role}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem icon="📊" label="Dashboard" page="dashboard" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
          <NavItem icon="📈" label="Reports" page="reports" active={page === 'reports'} onClick={() => setPage('reports')} />
          <NavItem icon="📥" label="Import" page="import" active={page === 'import'} onClick={() => setPage('import')} />
          <NavItem icon="🔄" label="Sync" page="sync" active={page === 'sync'} onClick={() => setPage('sync')} />
          <NavItem icon="✏️" label="Overrides" page="overrides" active={page === 'overrides'} onClick={() => setPage('overrides')} />
          <NavItem icon="📋" label="Jira" page="jira" active={page === 'jira'} onClick={() => setPage('jira')} />
          <div className="nav-divider" />
          <NavItem icon="⚙️" label="Settings" page="settings" active={page === 'settings'} onClick={() => setPage('settings')} />
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="breadcrumb">
            {navHistory.length > 1 && (
              <button className="back-btn" onClick={goBack}>← Back</button>
            )}
            <span className="breadcrumb-path">
              <span className="breadcrumb-home">🏠</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{getPageTitle(page)}</span>
            </span>
          </div>
          <div className="top-actions">
            <QuickSyncButton token={token} addNotification={addNotification} />
            <div className="clock">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {page === 'dashboard' && <DashboardPage token={token} addNotification={addNotification} />}
          {page === 'reports' && <ReportsPage token={token} addNotification={addNotification} />}
          {page === 'import' && <ImportPage token={token} addNotification={addNotification} />}
          {page === 'sync' && <SyncPage token={token} addNotification={addNotification} />}
          {page === 'overrides' && <OverridesPage token={token} />}
          {page === 'jira' && <JiraPage token={token} addNotification={addNotification} />}
          {page === 'settings' && <SettingsPage token={token} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, page, active, onClick }: { icon: string; label: string; page: Page; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {active && <span className="nav-indicator" />}
    </button>
  );
}

function getPageTitle(page: Page): string {
  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    reports: 'Reports',
    import: 'Import Data',
    sync: 'Clockify Sync',
    overrides: 'Overrides',
    jira: 'Jira Variance',
    settings: 'Settings'
  };
  return titles[page] || page;
}

function QuickSyncButton({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [syncing, setSyncing] = useState(false);

  async function quickSync() {
    setSyncing(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const res = await fetch(`${getApiUrl()}/api/v1/sync/clockify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startDate.toISOString().split('T')[0] + 'T00:00:00',
          end: endDate.toISOString().split('T')[0] + 'T23:59:59'
        })
      });
      const data = await res.json();
      if (res.ok) {
        addNotification('success', `Synced ${data.imported_entries || 0} entries from Clockify`);
      } else {
        addNotification('error', data.detail || 'Sync failed');
      }
    } catch {
      addNotification('error', 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button className="quick-sync-btn" onClick={quickSync} disabled={syncing}>
      {syncing ? '⏳' : '🔄'} {syncing ? 'Syncing...' : 'Quick Sync'}
    </button>
  );
}

function LoginPage({ onLogin, addNotification }: { onLogin: (t: string) => void; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
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
      addNotification('success', 'Welcome back!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
      </div>
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <span className="login-icon">🕐</span>
          <h1>Timesheet Compliance</h1>
          <p className="subtitle">Sign in to manage compliance</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="login-fields">
          <label>
            <span className="field-label">Email</span>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="your@email.com" />
            </div>
          </label>
          <label>
            <span className="field-label">Password</span>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
            </div>
          </label>
        </div>
        <button type="submit" disabled={loading} className="login-btn">
          {loading ? <span className="spinner" /> : 'Sign In'}
        </button>
        <p className="hint">Demo: admin@example.com / admin123</p>
      </form>
    </div>
  );
}

function DashboardPage({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<ComplianceMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ user: any; day: number } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  async function loadMonth() {
    setLoading(true);
    try {
      const m = await fetchMonth(token, year, month);
      setData(m);
    } catch (err) {
      addNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMonth(); }, [year, month]);

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
      addNotification('success', 'Excel exported successfully');
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
          <button className="view-toggle" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '📋 List' : '📊 Grid'}
          </button>
          <button onClick={exportExcel} className="btn-secondary">📥 Export Excel</button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <StatCard icon="✅" label="Approved" value={stats.approved} subtext={`${Math.round(stats.approved/stats.totalCells*100)}%`} color="success" />
          <StatCard icon="⚠️" label="Not Filled" value={stats.notFilled} subtext={`${Math.round(stats.notFilled/stats.totalCells*100)}%`} color="warning" />
          <StatCard icon="🏖️" label="Week Off" value={stats.weekOff} color="info" />
          <StatCard icon="📅" label="Leave" value={stats.leave} color="purple" />
          <StatCard icon="🚨" label="Anomalies" value={stats.anomalies} color="danger" />
          <StatCard icon="⏱️" label="Total Hours" value={`${Math.round(stats.totalHours)}h`} color="primary" />
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner large" /><p>Loading compliance data...</p></div>
      ) : data && (
        <div className="table-container">
          <div className="legend">
            <LegendItem badge="CO" label="Compliant" color="success" />
            <LegendItem badge="NF" label="Not Filled" color="muted" />
            <LegendItem badge="HF" label="Half Filled" color="warning" />
            <LegendItem badge="WO" label="Week Off" color="purple" />
            <LegendItem badge="LV" label="Leave" color="info" />
            <LegendItem badge="!" label="Anomaly" color="danger" />
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
        <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCell.user.full_name} - Day {selectedCell.day}</h3>
              <button className="modal-close" onClick={() => setSelectedCell(null)}>×</button>
            </div>
            {selectedCell.user.days[selectedCell.day] && (
              <div className="modal-body">
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`detail-value status-badge-${selectedCell.user.days[selectedCell.day].status.toLowerCase().replace('_', '-')}`}>
                    {selectedCell.user.days[selectedCell.day].status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hours</span>
                  <span className="detail-value">{selectedCell.user.days[selectedCell.day].hours}h</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Attendance</span>
                  <span className="detail-value">{selectedCell.user.days[selectedCell.day].attendance_code || '—'}</span>
                </div>
                {selectedCell.user.days[selectedCell.day].anomalies?.length > 0 && (
                  <div className="anomalies-section">
                    <span className="anomalies-label">⚠️ Anomalies</span>
                    <ul className="anomalies-list">
                      {selectedCell.user.days[selectedCell.day].anomalies.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSelectedCell(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: { icon: string; label: string; value: string | number; subtext?: string; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-content">
        <h3 className="stat-label">{label}</h3>
        <p className="stat-value">{value}</p>
        {subtext && <small className="stat-subtext">{subtext}</small>}
      </div>
    </div>
  );
}

function LegendItem({ badge, label, color }: { badge: string; label: string; color: string }) {
  return (
    <span className="legend-item">
      <span className={`badge badge-${color}`}>{badge}</span>
      <span className="legend-text">{label}</span>
    </span>
  );
}

function ReportsPage({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
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
      addNotification('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMonth(); }, [year, month]);

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
      return {
        user_id: row.user_id,
        name: row.full_name || row.email,
        email: row.email,
        role: row.role,
        approvedDays: approved,
        notFilledDays: notFilled,
        halfFilledDays: halfFilled,
        weekOffDays: weekOff,
        leaveDays: leave,
        anomalyDays,
        totalHours: Math.round(totalHours),
        avgHours: Math.round((approved > 0 ? totalHours / approved : 0) * 10) / 10
      };
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
      addNotification('success', 'Digest exported');
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
          <button onClick={exportDigest} className="btn-secondary">📄 Export Digest</button>
        </div>
      </div>

      <div className="report-tabs">
        <button className={reportType === 'summary' ? 'active' : ''} onClick={() => setReportType('summary')}>📊 Summary</button>
        <button className={reportType === 'employee' ? 'active' : ''} onClick={() => setReportType('employee')}>👥 By Employee</button>
        <button className={reportType === 'anomalies' ? 'active' : ''} onClick={() => setReportType('anomalies')}>🚨 Anomalies</button>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner large" /><p>Loading reports...</p></div>
      ) : (
        <>
          {reportType === 'summary' && monthStats && (
            <div className="report-summary">
              <div className="summary-grid">
                <SummaryCard label="Total Employees" value={monthStats.totalEmployees} />
                <SummaryCard label="Working Days" value={monthStats.totalDays} />
                <SummaryCard label="Approved Rate" value={`${monthStats.approvedPercent}%`} color="success" />
                <SummaryCard label="Not Filled Rate" value={`${monthStats.notFilledPercent}%`} color="warning" />
                <SummaryCard label="Total Anomalies" value={monthStats.anomalies} color="danger" />
              </div>

              {monthStats.topOffenders.length > 0 && (
                <div className="top-offenders card">
                  <h3 className="card-title">⚠️ Top Employees with Missing Timesheets</h3>
                  <table className="data-table">
                    <thead><tr><th>Employee</th><th>Not Filled</th><th>Approved</th><th>Total Hours</th></tr></thead>
                    <tbody>
                      {monthStats.topOffenders.map(e => (
                        <tr key={e.user_id} className="row-warning">
                          <td>{e.name}</td>
                          <td className="text-danger">{e.notFilledDays}</td>
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
            <div className="card">
              <h3 className="card-title">Employee-wise Breakdown</h3>
              <table className="data-table sortable">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th className="col-success">✅ Approved</th>
                    <th className="col-warning">⚠️ Not Filled</th>
                    <th>📊 Half</th>
                    <th>🏖️ Week Off</th>
                    <th>📅 Leave</th>
                    <th className="col-danger">🚨 Anomalies</th>
                    <th>⏱️ Hours</th>
                    <th>📈 Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats.map(e => (
                    <tr key={e.user_id} className={e.notFilledDays > 5 ? 'row-warning' : ''}>
                      <td>{e.name}</td>
                      <td>{e.role}</td>
                      <td className="text-success">{e.approvedDays}</td>
                      <td className={e.notFilledDays > 5 ? 'text-danger' : ''}>{e.notFilledDays}</td>
                      <td>{e.halfFilledDays}</td>
                      <td>{e.weekOffDays}</td>
                      <td>{e.leaveDays}</td>
                      <td className={e.anomalyDays > 0 ? 'text-warning' : ''}>{e.anomalyDays}</td>
                      <td>{e.totalHours}h</td>
                      <td>{e.avgHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'anomalies' && (
            <div className="card">
              <h3 className="card-title">Anomaly Details</h3>
              {anomalyList.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">✅</span><p>No anomalies detected this month!</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Day</th><th>Anomaly</th><th>Hours</th></tr></thead>
                  <tbody>
                    {anomalyList.map((a, i) => (
                      <tr key={i}>
                        <td>{a.user}</td>
                        <td>Day {a.day}</td>
                        <td className="text-danger">{a.anomaly}</td>
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

function SummaryCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className={`summary-card ${color ? `summary-${color}` : ''}`}>
      <h3>{label}</h3>
      <p className="big-num">{value}</p>
    </div>
  );
}

function ImportPage({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [timeEntriesFile, setTimeEntriesFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadAttendance() {
    if (!attendanceFile) return;
    setLoading(true);
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
        addNotification('success', `Imported ${data.rows} attendance records`);
        setAttendanceFile(null);
      } else {
        addNotification('error', data.detail || 'Import failed');
      }
    } catch {
      addNotification('error', 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function uploadTimeEntries() {
    if (!timeEntriesFile) return;
    setLoading(true);
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
        addNotification('success', `Imported ${data.imported || data.rows} time entries`);
        setTimeEntriesFile(null);
      } else {
        addNotification('error', data.detail || 'Import failed');
      }
    } catch {
      addNotification('error', 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">📥 Import Data</h1>

      <div className="import-cards">
        <div className="import-card card">
          <div className="import-header">
            <span className="import-icon">📋</span>
            <h2>Attendance Import</h2>
          </div>
          <p>Upload Attendance.xlsx with employee attendance codes (P, WO, EL, WFH, HD, etc.)</p>
          <div className="upload-area">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)} id="attendance-upload" className="file-input" />
            <label htmlFor="attendance-upload" className="file-label">
              {attendanceFile ? `📄 ${attendanceFile.name}` : 'Drop file or click to browse'}
            </label>
          </div>
          <button onClick={uploadAttendance} disabled={!attendanceFile || loading} className="btn-primary btn-block">
            {loading ? <><span className="spinner" /> Uploading...</> : '📤 Upload Attendance'}
          </button>
        </div>

        <div className="import-card card">
          <div className="import-header">
            <span className="import-icon">⏱️</span>
            <h2>Time Entries Import</h2>
          </div>
          <p>Upload Clockify time entries CSV/Excel export</p>
          <div className="upload-area">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setTimeEntriesFile(e.target.files?.[0] || null)} id="timeentries-upload" className="file-input" />
            <label htmlFor="timeentries-upload" className="file-label">
              {timeEntriesFile ? `📄 ${timeEntriesFile.name}` : 'Drop file or click to browse'}
            </label>
          </div>
          <button onClick={uploadTimeEntries} disabled={!timeEntriesFile || loading} className="btn-primary btn-block">
            {loading ? <><span className="spinner" /> Uploading...</> : '📤 Upload Time Entries'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SyncPage({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem('clockify_last_sync'));
  const [syncResult, setSyncResult] = useState<{ entries: number; errors: string[] } | null>(null);
  const [days, setDays] = useState(7);

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const res = await fetch(`${getApiUrl()}/api/v1/sync/clockify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        addNotification('success', `Synced ${data.imported_entries || 0} entries`);
      } else {
        addNotification('error', data.detail || 'Sync failed');
      }
    } catch {
      addNotification('error', 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">🔄 Clockify Sync</h1>

      <div className="sync-status-card card">
        <div className="sync-info">
          <h2>Automatic Sync</h2>
          <p className="sync-status">✅ Daily sync runs automatically at midnight (5:30 AM IST)</p>
          {lastSync && <p className="last-sync">Last sync: {lastSync}</p>}
        </div>
        <div className="sync-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value="1">Last 1 day</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button onClick={runSync} disabled={syncing} className="btn-primary btn-large">
            {syncing ? <><span className="spinner" /> Syncing...</> : '🔄 Sync Now'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="sync-result card">
          <h3>✅ Sync Complete</h3>
          <p><strong>Entries imported:</strong> {syncResult.entries}</p>
          {syncResult.errors.length > 0 && (
            <div className="sync-errors">
              <strong>⚠️ Errors:</strong>
              <ul>{syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="sync-help card">
        <h3>ℹ️ How it works</h3>
        <ul className="help-list">
          <li>API credentials are pre-configured in the server</li>
          <li>Manual sync pulls data from your Clockify workspace</li>
          <li>Automatic sync runs daily to keep data fresh</li>
          <li>All synced entries are matched with attendance records</li>
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
      <h1 className="page-title">✏️ Overrides</h1>
      <p className="page-subtitle">Manager-approved exceptions to compliance rules</p>

      {loading ? (
        <div className="loading-state"><div className="spinner large" /><p>Loading overrides...</p></div>
      ) : (
        <div className="card">
          {overrides.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No overrides configured yet</p>
              <p className="hint">Overrides allow managers to approve exceptions</p>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Date</th><th>Reason</th><th>Approved By</th></tr></thead>
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

function JiraPage({ token, addNotification }: { token: string; addNotification: (t: 'success' | 'error' | 'info', m: string) => void }) {
  const [jiraHost, setJiraHost] = useState('');
  const [jiraUser, setJiraUser] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [variance, setVariance] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchVariance() {
    if (!jiraHost || !jiraUser || !jiraToken) {
      addNotification('error', 'Please fill all Jira credentials');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/jira/variance?jira_host=${encodeURIComponent(jiraHost)}&jira_user=${encodeURIComponent(jiraUser)}&jira_token=${encodeURIComponent(jiraToken)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVariance(data.issues || []);
        addNotification('success', `Loaded ${data.issues?.length || 0} Jira issues`);
      } else {
        addNotification('error', 'Failed to fetch Jira data');
      }
    } catch {
      addNotification('error', 'Jira connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">📋 Jira Variance Report</h1>
      <p className="page-subtitle">Compare estimated vs actual hours from Jira issues</p>

      <div className="card">
        <h3 className="card-title">Connect to Jira</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>Jira Host</label>
            <input value={jiraHost} onChange={(e) => setJiraHost(e.target.value)} placeholder="yourcompany.atlassian.net" />
          </div>
          <div className="form-field">
            <label>Jira Email</label>
            <input value={jiraUser} onChange={(e) => setJiraUser(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="form-field">
            <label>API Token</label>
            <input type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} placeholder="Jira API token" />
          </div>
        </div>
        <button onClick={fetchVariance} disabled={!jiraHost || !jiraUser || !jiraToken || loading} className="btn-primary">
          {loading ? <><span className="spinner" /> Fetching...</> : '📊 Fetch Variance'}
        </button>
      </div>

      {variance && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Issue</th><th>Summary</th><th>Estimated</th><th>Actual</th><th>Variance</th></tr></thead>
            <tbody>
              {variance.map((v, i) => (
                <tr key={i}>
                  <td><a href={`https://${jiraHost}/browse/${v.key}`} target="_blank" className="link">{v.key}</a></td>
                  <td>{v.summary}</td>
                  <td>{v.estimated}h</td>
                  <td>{v.actual}h</td>
                  <td className={v.variance > 0 ? 'text-danger' : 'text-success'}>{v.variance > 0 ? '+' : ''}{v.variance}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ token, darkMode, toggleDarkMode }: { token: string; darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <div className="page">
      <h1 className="page-title">⚙️ Settings</h1>

      <div className="settings-grid">
        <div className="settings-card card">
          <h2>🎨 Appearance</h2>
          <div className="setting-row">
            <span className="setting-label">Theme</span>
            <button className={`theme-btn ${darkMode ? 'dark' : 'light'}`} onClick={toggleDarkMode}>
              {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </div>

        <div className="settings-card card">
          <h2>📊 Compliance Thresholds</h2>
          <p>Configured in <code>config/thresholds.yaml</code></p>
          <ul className="settings-list">
            <li><strong>Minimum hours:</strong> 8 hours/day</li>
            <li><strong>Anomaly threshold:</strong> 12 hours/day</li>
          </ul>
        </div>

        <div className="settings-card card">
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

        <div className="settings-card card">
          <h2>🔗 API Configuration</h2>
          <p>Base URL: <code className="inline-code">{getApiUrl()}</code></p>
          <p>API Docs: <a href={`${getApiUrl()}/docs`} target="_blank" className="link">OpenAPI Documentation</a></p>
          <p>Health: <a href={`${getApiUrl()}/api/v1/health`} target="_blank" className="link">System Status</a></p>
        </div>

        <div className="settings-card card">
          <h2>🔄 Sync Schedule</h2>
          <p>Automatic sync runs daily at midnight (5:30 AM IST)</p>
          <p>Clockify workspace is pre-configured</p>
        </div>
      </div>
    </div>
  );
}

export default App;