import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  Sparkles,
  Server,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  Search,
  Check,
  ShieldAlert,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';

const API_BASE = ''; // Uses Vite proxy to http://localhost:5000

export default function App() {
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalAnomalies: 0,
    activeAnomalies: 0,
    resolvedAnomalies: 0,
    criticalCount: 0,
    warningCount: 0,
    avgLatency: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'records' | 'simulator'

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [emailModal, setEmailModal] = useState({ open: false, alert: null, sending: false, result: null });
  const [notification, setNotification] = useState(null);

  // Simulator Form State
  const [simForm, setSimForm] = useState({
    api_name: 'AppointmentAPI',
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0,
  });
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/alerts/stats`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterSeverity !== 'ALL') params.severity = filterSeverity;
      if (searchQuery.trim()) params.api_name = searchQuery.trim();

      const res = await axios.get(`${API_BASE}/alerts`, { params });
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, [filterStatus, filterSeverity, searchQuery]);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/monitor/records?limit=30`);
      if (res.data.success) {
        setRecords(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchAlerts(), fetchRecords()]);
    setLoading(false);
  }, [fetchStats, fetchAlerts, fetchRecords]);

  // Initial load & Polling
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchAlerts();
      if (activeTab === 'records') fetchRecords();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchStats, fetchAlerts, fetchRecords]);

  // Action: Ingest Sample Batch Dataset
  const handleLoadSample = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/monitor/load-sample`);
      if (res.data.success) {
        showToast(`Ingested sample data: ${res.data.data.totalProcessed} records processed (${res.data.data.anomaliesDetected} anomalies detected).`, 'success');
        await refreshAll();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Action: Reset Telemetry
  const handleResetData = async () => {
    if (!window.confirm('Reset all monitored telemetry and alert history?')) return;
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/alerts/reset`);
      showToast('All monitoring records and alerts have been wiped.', 'info');
      await refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Action: Update Alert Status
  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      const res = await axios.patch(`${API_BASE}/alerts/${alertId}/status`, { status: newStatus });
      if (res.data.success) {
        showToast(`Alert #${alertId} marked as ${newStatus}`, 'success');
        fetchAlerts();
        fetchStats();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  // Action: Send Email
  const handleSendEmail = async (alert) => {
    setEmailModal({ open: true, alert, sending: true, result: null });
    try {
      const res = await axios.post(`${API_BASE}/alerts/${alert.id}/email`, {
        recipient: 'oncall-team@company.com',
      });
      setEmailModal({
        open: true,
        alert,
        sending: false,
        result: res.data.data,
      });
      fetchAlerts();
    } catch (err) {
      setEmailModal({
        open: true,
        alert,
        sending: false,
        result: { error: err.response?.data?.error || err.message },
      });
    }
  };

  // Action: Submit Simulator Telemetry
  const handleSimSubmit = async (e) => {
    e.preventDefault();
    setSimSubmitting(true);
    setSimResult(null);
    try {
      const payload = {
        api_name: simForm.api_name,
        response_time_ms: Number(simForm.response_time_ms),
        status_code: Number(simForm.status_code),
        records_returned: Number(simForm.records_returned),
      };
      const res = await axios.post(`${API_BASE}/monitor`, payload);
      setSimResult(res.data.data);
      showToast(
        res.data.data.evaluation.isAnomaly
          ? `Anomaly detected for ${simForm.api_name}!`
          : `Metric ingested as HEALTHY`,
        res.data.data.evaluation.isAnomaly ? 'warning' : 'success'
      );
      await refreshAll();
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSimSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Presets for simulator
  const presets = [
    {
      label: 'AppointmentAPI (500 Error Outage)',
      data: { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 },
    },
    {
      label: 'BillingAPI (High Latency SLA breach)',
      data: { api_name: 'BillingAPI', response_time_ms: 3400, status_code: 200, records_returned: 140 },
    },
    {
      label: 'PatientDataAPI (Healthy 200 OK)',
      data: { api_name: 'PatientDataAPI', response_time_ms: 850, status_code: 200, records_returned: 85 },
    },
    {
      label: 'InsuranceClaimsAPI (401 Unauthorized)',
      data: { api_name: 'InsuranceClaimsAPI', response_time_ms: 2200, status_code: 401, records_returned: 0 },
    },
    {
      label: 'LabResultsAPI (Zero Records Warning)',
      data: { api_name: 'LabResultsAPI', response_time_ms: 920, status_code: 200, records_returned: 0 },
    },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor:
              notification.type === 'error'
                ? 'var(--critical)'
                : notification.type === 'success'
                ? 'var(--success)'
                : notification.type === 'warning'
                ? 'var(--warning)'
                : 'var(--primary)',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Top Navbar Header */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            <Activity size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Intelligent API Monitoring & Alert System
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  boxShadow: '0 0 8px var(--success)',
                }}
              />
              Live Telemetry &bull; AI-Powered Anomaly Detection &bull; Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {/* Global Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
              border: `1px solid ${autoRefresh ? 'var(--success-border)' : 'var(--border)'}`,
              color: autoRefresh ? 'var(--success)' : 'var(--text-secondary)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'pulse-badge' : ''} />
            {autoRefresh ? 'Live Polling: ON' : 'Live Polling: PAUSED'}
          </button>

          <button
            onClick={handleLoadSample}
            disabled={loading}
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px var(--primary-glow)',
            }}
          >
            <Play size={14} fill="#ffffff" />
            Ingest Static Sample Batch
          </button>

          <button
            onClick={refreshAll}
            disabled={loading}
            title="Manual Refresh"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={handleResetData}
            title="Wipe & Reset Telemetry Database"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
          >
            <Database size={15} />
          </button>
        </div>
      </header>

      {/* KPI Stats Overview Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Total Ingested */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Telemetry</span>
            <Activity size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
            {stats.totalRecords}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Processed via /monitor & static files
          </div>
        </div>

        {/* Active Anomalies */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${stats.activeAnomalies > 0 ? 'var(--critical-border)' : 'var(--border)'}`,
            borderRadius: '14px',
            padding: '18px 20px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: stats.activeAnomalies > 0 ? 'var(--critical)' : 'var(--text-secondary)', fontWeight: 600 }}>
              Active Anomalies
            </span>
            <ShieldAlert size={18} color={stats.activeAnomalies > 0 ? 'var(--critical)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: stats.activeAnomalies > 0 ? 'var(--critical)' : 'var(--text-primary)' }}>
            {stats.activeAnomalies}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats.resolvedAnomalies} resolved &bull; {stats.totalAnomalies} all time
          </div>
        </div>

        {/* Critical Failures */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Critical Severity</span>
            <AlertTriangle size={18} color="var(--critical)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--critical)' }}>
            {stats.criticalCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats.warningCount} in WARNING status
          </div>
        </div>

        {/* Average Latency */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Response Time</span>
            <Clock size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
            {stats.avgLatency} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>ms</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Warning: &gt;2000ms &bull; Critical: &gt;4000ms
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            background: 'none',
            color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'alerts' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '12px 18px',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <AlertTriangle size={16} />
          Active Alerts & AI Diagnosis ({alerts.length})
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          style={{
            background: 'none',
            color: activeTab === 'simulator' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'simulator' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '12px 18px',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <Zap size={16} />
          Telemetry Ingestion Simulator
        </button>

        <button
          onClick={() => {
            setActiveTab('records');
            fetchRecords();
          }}
          style={{
            background: 'none',
            color: activeTab === 'records' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'records' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '12px 18px',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 0,
          }}
        >
          <Server size={16} />
          Raw Telemetry Stream ({records.length})
        </button>
      </div>

      {/* TAB 1: ALERTS & ANOMALIES VIEW */}
      {activeTab === 'alerts' && (
        <section>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by API name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '13px' }}
              />
            </div>

            {/* Severity & Status Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: '8px' }}>
                {['ALL', 'CRITICAL', 'WARNING'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: filterSeverity === sev ? 'var(--primary)' : 'transparent',
                      color: filterSeverity === sev ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: '8px' }}>
                {['ALL', 'ACTIVE', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: filterStatus === st ? 'var(--border-light)' : 'transparent',
                      color: filterStatus === st ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts Feed */}
          {alerts.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: '16px',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No Anomalies Found</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 20px' }}>
                All systems healthy, or no alerts match the active filters. Ingest the static sample dataset to observe AI anomaly alerting.
              </p>
              <button
                onClick={handleLoadSample}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Ingest Sample Dataset
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {alerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isResolved = alert.status === 'RESOLVED';
                const isExpanded = expandedAlerts[alert.id];

                return (
                  <div
                    key={alert.id}
                    className="fade-in"
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${
                        isResolved
                          ? 'var(--border)'
                          : isCritical
                          ? 'var(--critical-border)'
                          : 'var(--warning-border)'
                      }`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    {/* Top Row Header */}
                    <div
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        background: isResolved
                          ? 'transparent'
                          : isCritical
                          ? 'var(--critical-bg)'
                          : 'var(--warning-bg)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Severity Tag */}
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            background: isCritical ? 'var(--critical)' : 'var(--warning)',
                            color: '#ffffff',
                          }}
                        >
                          {alert.severity}
                        </span>

                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {alert.api_name}
                        </span>

                        {/* Status Code badge */}
                        <span
                          className="font-mono"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: alert.status_code >= 500 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: alert.status_code >= 500 ? 'var(--critical)' : 'var(--warning)',
                            border: `1px solid ${alert.status_code >= 500 ? 'var(--critical-border)' : 'var(--warning-border)'}`,
                          }}
                        >
                          HTTP {alert.status_code}
                        </span>

                        {/* Latency */}
                        <span
                          className="font-mono"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'var(--bg-input)',
                            color: alert.response_time_ms >= 4000 ? 'var(--critical)' : 'var(--text-secondary)',
                          }}
                        >
                          {alert.response_time_ms} ms
                        </span>

                        {/* Records Count */}
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'var(--bg-input)',
                            color: alert.records_returned === 0 ? 'var(--warning)' : 'var(--text-secondary)',
                          }}
                        >
                          {alert.records_returned} records
                        </span>
                      </div>

                      {/* Header Right: Status selector and Timestamp */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>

                        <select
                          value={alert.status}
                          onChange={(e) => handleUpdateStatus(alert.id, e.target.value)}
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: alert.status === 'RESOLVED' ? 'var(--success-bg)' : 'var(--bg-input)',
                            color: alert.status === 'RESOLVED' ? 'var(--success)' : 'var(--text-primary)',
                            borderColor: alert.status === 'RESOLVED' ? 'var(--success-border)' : 'var(--border)',
                          }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                          <option value="RESOLVED">RESOLVED</option>
                        </select>
                      </div>
                    </div>

                    {/* Card Body: AI Alert Message */}
                    <div style={{ padding: '20px' }}>
                      <div
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Sparkles size={16} color="var(--primary)" />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            AI-Generated Human Alert
                          </span>
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          "{alert.ai_alert_message}"
                        </p>
                      </div>

                      {/* Anomaly Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                        {(Array.isArray(alert.anomaly_types) ? alert.anomaly_types : [alert.anomaly_types]).map((tag, idx) => (
                          <span
                            key={idx}
                            className="font-mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Expandable Root Cause & Recommendation */}
                      {isExpanded && (
                        <div
                          className="fade-in"
                          style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '16px',
                          }}
                        >
                          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Probable Root Cause
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                              {alert.ai_root_cause || 'Telemetry divergence under investigation.'}
                            </p>
                          </div>

                          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Actionable Recommendation
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                              {alert.ai_recommendation || 'Examine downstream application server logs.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '16px',
                          paddingTop: '12px',
                        }}
                      >
                        <button
                          onClick={() => toggleExpand(alert.id)}
                          style={{
                            background: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                          }}
                        >
                          {isExpanded ? (
                            <>
                              Hide Root Cause & Steps <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              View Root Cause & Steps <ChevronDown size={14} />
                            </>
                          )}
                        </button>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {alert.email_sent && alert.email_preview_url && (
                            <a
                              href={alert.email_preview_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: 'var(--info)',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                background: 'var(--info-bg)',
                                borderRadius: '6px',
                                border: '1px solid var(--info-border)',
                              }}
                            >
                              <ExternalLink size={13} /> View Dispatched Email
                            </a>
                          )}

                          <button
                            onClick={() => handleSendEmail(alert)}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '6px 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Mail size={13} />
                            {alert.email_sent ? 'Resend Email Report' : 'Dispatch Email Report'}
                          </button>

                          {alert.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                              style={{
                                background: 'var(--success-bg)',
                                border: '1px solid var(--success-border)',
                                color: 'var(--success)',
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Check size={14} /> Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TELEMETRY INGESTION SIMULATOR */}
      {activeTab === 'simulator' && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Simulator Form */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--primary)" />
              API Telemetry Simulator
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Simulate live API calls to test health monitoring, anomaly detection, and AI alert generation.
            </p>

            {/* Presets */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Load Test Scenario Preset:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSimForm(p.data)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    &bull; {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  API Name
                </label>
                <input
                  type="text"
                  required
                  value={simForm.api_name}
                  onChange={(e) => setSimForm({ ...simForm, api_name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Response Time (ms)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={simForm.response_time_ms}
                    onChange={(e) => setSimForm({ ...simForm, response_time_ms: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    HTTP Status Code
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="599"
                    required
                    value={simForm.status_code}
                    onChange={(e) => setSimForm({ ...simForm, status_code: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Records Returned
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={simForm.records_returned}
                  onChange={(e) => setSimForm({ ...simForm, records_returned: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                disabled={simSubmitting}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <Send size={16} />
                {simSubmitting ? 'Evaluating via AI...' : 'Submit to POST /monitor'}
              </button>
            </form>
          </div>

          {/* Simulator Response Preview */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Real-time Ingestion Result
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Detailed output from the anomaly detection matrix & AI reasoning layer.
            </p>

            {simResult ? (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: simResult.evaluation.isAnomaly ? 'var(--critical-bg)' : 'var(--success-bg)',
                    border: `1px solid ${simResult.evaluation.isAnomaly ? 'var(--critical-border)' : 'var(--success-border)'}`,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: simResult.evaluation.isAnomaly ? 'var(--critical)' : 'var(--success)' }}>
                    {simResult.evaluation.isAnomaly ? `ANOMALY FLAGGED: ${simResult.evaluation.severity}` : 'HEALTHY API RESPONSE'}
                  </div>
                  {simResult.evaluation.reasons.length > 0 && (
                    <ul style={{ margin: '8px 0 0 18px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {simResult.evaluation.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {simResult.anomaly && (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                      <Sparkles size={14} /> AI-Generated Alert Output
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      "{simResult.anomaly.ai_alert_message}"
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Root Cause:</strong> {simResult.anomaly.ai_root_cause}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <strong>Recommendation:</strong> {simResult.anomaly.ai_recommendation}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Raw Server Response JSON:</label>
                  <pre
                    className="font-mono"
                    style={{
                      background: 'var(--bg-input)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      overflowX: 'auto',
                      marginTop: '6px',
                      maxHeight: '180px',
                    }}
                  >
                    {JSON.stringify(simResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  padding: '40px',
                  textAlign: 'center',
                }}
              >
                Send a payload using the form on the left to see live AI detection results here.
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: RAW TELEMETRY STREAM */}
      {activeTab === 'records' && (
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Telemetry Stream</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing last 30 raw API ingestion events in SQLite
              </p>
            </div>
            <button
              onClick={fetchRecords}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            >
              Refresh Stream
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>ID</th>
                  <th style={{ padding: '12px 16px' }}>API Name</th>
                  <th style={{ padding: '12px 16px' }}>Status Code</th>
                  <th style={{ padding: '12px 16px' }}>Latency</th>
                  <th style={{ padding: '12px 16px' }}>Records</th>
                  <th style={{ padding: '12px 16px' }}>Classification</th>
                  <th style={{ padding: '12px 16px' }}>Ingested At</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="font-mono" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      #{rec.id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{rec.api_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className="font-mono"
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                          background: rec.status_code >= 400 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: rec.status_code >= 400 ? 'var(--critical)' : 'var(--success)',
                        }}
                      >
                        {rec.status_code}
                      </span>
                    </td>
                    <td className="font-mono" style={{ padding: '12px 16px' }}>{rec.response_time_ms} ms</td>
                    <td style={{ padding: '12px 16px' }}>{rec.records_returned}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {rec.is_anomaly ? (
                        <span style={{ color: 'var(--critical)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} /> Anomaly
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Healthy
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(rec.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Email Dispatch Result Modal */}
      {emailModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            className="fade-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Mail size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Alert Email Report</h3>
            </div>

            {emailModal.sending ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '20px 0' }}>
                Connecting to SMTP transporter and dispatching email report...
              </p>
            ) : emailModal.result?.error ? (
              <div style={{ color: 'var(--critical)', fontSize: '14px', margin: '16px 0' }}>
                Failed to send email: {emailModal.result.error}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  The anomaly alert for <strong>{emailModal.alert?.api_name}</strong> has been formatted into HTML and sent!
                </p>

                {emailModal.result?.previewUrl && (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                      Ethereal Test Mail Preview URL:
                    </div>
                    <a
                      href={emailModal.result.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: '#60a5fa',
                        fontSize: '13px',
                        wordBreak: 'break-all',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={15} /> Open Email in Browser
                    </a>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setEmailModal({ open: false, alert: null, sending: false, result: null })}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
