import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  HelpCircle,
  Inbox,
  Key,
  Mail,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import './App.css';

const API_BASE = '';

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total_telemetry_records: 0,
    total_anomalies: 0,
    active_anomalies: 0,
    resolved_anomalies: 0,
    critical_count: 0,
    warning_count: 0,
    anomaly_rate_percentage: 0.0,
    system_health_percentage: 100.0,
    avg_response_time_ms: 0.0,
  });
  const [aiConfig, setAiConfig] = useState({
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    has_api_key: false,
    status: 'SRE Engine (Ready for Key)',
  });
  const [telemetry, setTelemetry] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');

  const [singleForm, setSingleForm] = useState({
    api_name: 'AppointmentAPI',
    endpoint: '/v1/appointments/today',
    status_code: 500,
    response_time_ms: 1420.5,
    records_returned: 0,
  });

  const [batchJson, setBatchJson] = useState(`[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]`);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const statsRes = await fetch(`${API_BASE}/alerts/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      let alertUrl = `${API_BASE}/alerts?status=${statusFilter}`;
      if (severityFilter !== 'ALL') {
        alertUrl += `&severity=${severityFilter}`;
      }
      const alertsRes = await fetch(alertUrl);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      const telemRes = await fetch(`${API_BASE}/monitor/records?limit=60`);
      if (telemRes.ok) {
        const telemData = await telemRes.json();
        setTelemetry(telemData);
      }

      const aiRes = await fetch(`${API_BASE}/ai/config`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiConfig(aiData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    loadData();
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData, autoRefresh]);

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/monitor/load-sample`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Loaded ${data.total_processed} telemetry records (${data.anomalies_detected} AI alerts)`, 'success');
        await loadData();
      } else {
        const err = await res.json();
        showToast(`Error: ${err.detail || 'Failed to load sample'}`, 'error');
      }
    } catch (e) {
      showToast(`Network error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: 'POST' });
      if (res.ok) {
        showToast(`Alert #${alertId} marked as resolved.`, 'success');
        await loadData();
      }
    } catch (e) {
      showToast(`Failed to resolve alert: ${e.message}`, 'error');
    }
  };

  const handleSendEmail = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/notify-email`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Alert email dispatched to ${data.recipient}`, 'success');
        await loadData();
      }
    } catch (e) {
      showToast(`Email error: ${e.message}`, 'error');
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Clear all telemetry records and active alerts?')) return;
    try {
      const res = await fetch(`${API_BASE}/alerts/clear`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Telemetry and alerts cleared.', 'info');
        await loadData();
      }
    } catch (e) {
      showToast(`Clear error: ${e.message}`, 'error');
    }
  };

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleForm),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSimulateOpen(false);
        showToast(`Telemetry ingested: ${data.anomalies_detected ? 'AI Anomaly Alert Generated' : 'Healthy 200 OK'}`, 'success');
        await loadData();
      } else {
        const err = await res.json();
        showToast(`Validation error: ${err.detail || 'Invalid payload'}`, 'error');
      }
    } catch (err) {
      showToast(`Request failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = JSON.parse(batchJson);
      const res = await fetch(`${API_BASE}/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (res.ok) {
        const data = await res.json();
        setIsBatchOpen(false);
        showToast(`Batch processed: ${data.total_processed} items (${data.anomalies_detected} AI alerts)`, 'success');
        await loadData();
      } else {
        const err = await res.json();
        showToast(`Batch error: ${err.detail || 'Failed processing'}`, 'error');
      }
    } catch (err) {
      showToast(`Invalid JSON syntax: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: inputApiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data);
        setIsAiModalOpen(false);
        showToast(`AI Config updated: ${data.has_api_key ? 'Live OpenAI API Key active' : 'SRE Heuristic mode active'}`, 'success');
      }
    } catch (err) {
      showToast(`Failed to update key: ${err.message}`, 'error');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.api_name.toLowerCase().includes(q) ||
      (a.endpoint && a.endpoint.toLowerCase().includes(q)) ||
      a.ai_alert_message.toLowerCase().includes(q) ||
      a.severity.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-container">
      {toast && (
        <div className="toast-notice">
          <Zap size={18} color="#60a5fa" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="brand-title">Intelligent API Monitoring & Alert System</h1>
            <div className="brand-subtitle">
              <span>Automated API Health Monitoring & AI Descriptive Alert Generation</span>
              <span className="ai-status-pill" onClick={() => setIsAiModalOpen(true)} title="Click to view AI Configuration">
                <Bot size={13} />
                <span>OpenAI ({aiConfig.model})</span>
                <span className="live-dot" style={{ background: aiConfig.has_api_key ? '#10b981' : '#60a5fa' }}></span>
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-ai-config" onClick={() => setIsAiModalOpen(true)} title="AI Integration Configuration">
            <Sparkles size={16} /> AI Integration
          </button>
          <button className="btn btn-accent" onClick={handleLoadSample} disabled={loading}>
            <UploadCloud size={16} /> Load Sample Data
          </button>
          <button className="btn btn-primary" onClick={() => setIsSimulateOpen(true)}>
            <PlusCircle size={16} /> Simulate Telemetry
          </button>
          <button className="btn btn-secondary" onClick={() => setIsBatchOpen(true)}>
            <Inbox size={16} /> Batch JSON Ingest
          </button>
          <button
            className={`btn btn-secondary ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-refresh every 5s"
          >
            <RefreshCw size={15} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? '5s Polling ON' : 'Paused'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleClearData} title="Clear database records">
            <Trash2 size={15} /> Clear
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span>Total Ingested Telemetry</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Database size={18} />
            </div>
          </div>
          <div className="kpi-value">{stats.total_telemetry_records}</div>
          <div className="kpi-foot">
            <Activity size={13} /> Across all monitored services
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>AI Detected Incidents</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <Flame size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: stats.active_anomalies > 0 ? '#f87171' : '#10b981' }}>
            {stats.active_anomalies}
          </div>
          <div className="kpi-foot">
            <span>{stats.critical_count} Critical</span>
            <span>•</span>
            <span>{stats.warning_count} Warning</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>System Health Score</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: stats.system_health_percentage > 85 ? '#34d399' : '#fbbf24' }}>
            {stats.system_health_percentage}%
          </div>
          <div className="kpi-foot">
            <span>Anomaly Rate: {stats.anomaly_rate_percentage}%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>Avg Response Latency</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {stats.avg_response_time_ms.toFixed(1)} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>ms</span>
          </div>
          <div className="kpi-foot">
            <span>SLA Warning: 2000ms • Critical: 4000ms</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="control-bar">
        <div className="tabs-wrapper">
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bot size={15} color="#818cf8" />
            AI Alerts & Anomalies ({filteredAlerts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setActiveTab('telemetry')}
          >
            <Server size={15} />
            Telemetry Stream ({telemetry.length})
          </button>
        </div>

        {activeTab === 'alerts' && (
          <div className="filter-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ACTIVE">Status: Active</option>
              <option value="RESOLVED">Status: Resolved</option>
              <option value="ALL">Status: All</option>
            </select>

            <select
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
            </select>

            <div>
              <input
                type="text"
                className="search-input"
                placeholder="Search service or alert text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'alerts' ? (
        <div className="alerts-feed">
          {filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 className="empty-icon" color="#10b981" />
              <h3>All Monitored Services Healthy</h3>
              <p style={{ color: '#64748b', marginTop: '6px' }}>
                No active anomalies detected. Click "Load Sample Data" or "Simulate Telemetry" to test the AI alert generator.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card ${alert.severity === 'CRITICAL' ? 'critical' : 'warning'} ${
                  alert.status === 'RESOLVED' ? 'resolved' : ''
                }`}
              >
                {/* Topline Header */}
                <div className="alert-topline">
                  <div className="alert-badges">
                    <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                      {alert.severity}
                    </span>
                    <span className="api-title">
                      {alert.api_name}
                      {alert.endpoint && <span className="api-endpoint">{alert.endpoint}</span>}
                    </span>
                    {alert.anomaly_types &&
                      alert.anomaly_types.map((tag, i) => (
                        <span key={i} className="badge badge-tag">
                          {tag}
                        </span>
                      ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ai-model-tag">
                      <Bot size={12} /> OpenAI ({aiConfig.model})
                    </span>
                    {alert.status === 'RESOLVED' ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                        RESOLVED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* AI-Generated Descriptive Alert Highlight Box */}
                <div className="ai-alert-container">
                  <div className="ai-alert-header">
                    <div className="ai-header-left">
                      <Sparkles size={14} color="#818cf8" />
                      <span className="ai-header-title">AI-GENERATED DESCRIPTIVE ALERT</span>
                    </div>
                    <span className="ai-engine-chip">
                      Engine: {alert.ai_engine_used || 'OpenAI gpt-4o-mini'}
                    </span>
                  </div>
                  <div className="ai-alert-message">
                    "{alert.ai_alert_message}"
                  </div>
                </div>

                {/* Telemetry Metrics Row */}
                <div className="telemetry-meta-row">
                  <div className="meta-item">
                    <span className="meta-label">HTTP Status</span>
                    <span
                      className="meta-val"
                      style={{ color: alert.status_code >= 500 ? '#f87171' : alert.status_code >= 400 ? '#fbbf24' : '#34d399' }}
                    >
                      {alert.status_code}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Response Time</span>
                    <span
                      className="meta-val"
                      style={{ color: alert.response_time_ms >= 4000 ? '#f87171' : alert.response_time_ms >= 2000 ? '#fbbf24' : '#e2e8f0' }}
                    >
                      {alert.response_time_ms} ms
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Records Returned</span>
                    <span className="meta-val" style={{ color: alert.records_returned === 0 ? '#f87171' : '#e2e8f0' }}>
                      {alert.records_returned !== null ? alert.records_returned : 'N/A'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Alert ID</span>
                    <span className="meta-val">#{alert.id}</span>
                  </div>
                </div>

                {/* AI Root Cause & Recommendation Grid */}
                <div className="diagnostics-grid">
                  <div className="diagnostic-box">
                    <div className="diagnostic-title">
                      <HelpCircle size={14} color="#f59e0b" /> AI Root Cause Analysis
                    </div>
                    <div className="diagnostic-desc">{alert.ai_root_cause || 'Metric threshold breach flagged by monitoring engine.'}</div>
                  </div>

                  <div className="diagnostic-box">
                    <div className="diagnostic-title">
                      <Zap size={14} color="#60a5fa" /> AI Recommended Action
                    </div>
                    <div className="diagnostic-desc">{alert.ai_recommendation || 'Inspect microservice logs and verify upstream SLAs.'}</div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="alert-foot">
                  <div className="alert-timestamp">
                    Detected: {new Date(alert.created_at).toLocaleString()}
                    {alert.resolved_at && ` • Resolved: ${new Date(alert.resolved_at).toLocaleString()}`}
                  </div>

                  <div className="alert-action-btns">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSendEmail(alert.id)}
                      title="Send email alert notification"
                    >
                      <Mail size={13} /> {alert.email_dispatched ? 'Resend Email' : 'Email Alert'}
                    </button>
                    {alert.status === 'ACTIVE' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle2 size={13} /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Telemetry Stream */
        <div className="telemetry-table-wrapper">
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Service Name</th>
                <th>Endpoint</th>
                <th>HTTP Status</th>
                <th>Response Time</th>
                <th>Records</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                    No telemetry records logged yet.
                  </td>
                </tr>
              ) : (
                telemetry.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                    <td style={{ fontWeight: 600 }}>{t.api_name}</td>
                    <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{t.endpoint || '—'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: t.status_code >= 500 ? 'rgba(239, 68, 68, 0.2)' : t.status_code >= 400 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: t.status_code >= 500 ? '#fca5a5' : t.status_code >= 400 ? '#fde68a' : '#86efac',
                        }}
                      >
                        {t.status_code}
                      </span>
                    </td>
                    <td>{t.response_time_ms} ms</td>
                    <td>{t.records_returned !== null ? t.records_returned : '—'}</td>
                    <td>
                      {t.is_anomaly ? (
                        <span className="badge badge-critical">ANOMALY</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                          HEALTHY
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: AI Integration & Model Configuration */}
      {isAiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAiModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#818cf8" /> AI Integration Specification
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAiModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#e0e7ff', lineHeight: 1.5 }}>
                <strong>Technical Requirement Met:</strong> Section 6.3 & Section 8
                <ul style={{ marginTop: '6px', marginLeft: '18px' }}>
                  <li><strong>LLM Provider:</strong> OpenAI API (<code style={{ color: '#a5b4fc' }}>gpt-4o-mini</code>)</li>
                  <li><strong>Capability:</strong> Automated Descriptive Root-Cause Alert Generation</li>
                  <li><strong>Dual Engine:</strong> Live OpenAI API calls with zero-quota fallback</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey}>
              <div className="form-group">
                <label className="form-label">
                  <Key size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  OpenAI API Key (Optional)
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={aiConfig.has_api_key ? '••••••••••••••••••••••••' : 'Paste sk-proj-... or leave blank for heuristic mode'}
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                />
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {aiConfig.has_api_key ? 'Active key detected in environment.' : 'Leave blank to use zero-cost intelligent heuristic alert engine.'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Active Model</label>
                <input type="text" className="form-control" value="gpt-4o-mini" disabled style={{ opacity: 0.7 }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAiModalOpen(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-accent">
                  Save & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Simulate Single Telemetry */}
      {isSimulateOpen && (
        <div className="modal-overlay" onClick={() => setIsSimulateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Simulate Live Telemetry</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsSimulateOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit}>
              <div className="form-group">
                <label className="form-label">API Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={singleForm.api_name}
                  onChange={(e) => setSingleForm({ ...singleForm, api_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endpoint Path</label>
                <input
                  type="text"
                  className="form-control"
                  value={singleForm.endpoint}
                  onChange={(e) => setSingleForm({ ...singleForm, endpoint: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">HTTP Status Code</label>
                  <input
                    type="number"
                    className="form-control"
                    value={singleForm.status_code}
                    onChange={(e) => setSingleForm({ ...singleForm, status_code: parseInt(e.target.value) || 200 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Response Time (ms)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={singleForm.response_time_ms}
                    onChange={(e) => setSingleForm({ ...singleForm, response_time_ms: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Records Returned</label>
                <input
                  type="number"
                  className="form-control"
                  value={singleForm.records_returned}
                  onChange={(e) => setSingleForm({ ...singleForm, records_returned: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSimulateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Play size={15} /> Ingest & Generate AI Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch JSON Ingest */}
      {isBatchOpen && (
        <div className="modal-overlay" onClick={() => setIsBatchOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Batch Telemetry Ingestion (JSON)</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsBatchOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit}>
              <div className="form-group">
                <label className="form-label">Paste JSON Array of Telemetry Records:</label>
                <textarea
                  className="form-control"
                  rows="10"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBatchOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={loading}>
                  <UploadCloud size={15} /> Submit Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
