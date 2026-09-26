// frontend/src/components/dashboard/Dashboard.jsx
// CampusResolve — Management-only operations dashboard.
// Stats, trend chart, category chart, filterable ticket table, and exports.

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../utils/api';

// ── Brand-aligned chart palette ────────────────────────────────
const PIE_COLORS = [
  '#0F766E', '#D97745', '#16805B', '#C47A16',
  '#2DD4BF', '#C94A4A', '#134E4A', '#6B7280',
];

// ── Status config ──────────────────────────────────────────────
const STATUS_LABELS = {
  open:        { label: 'Open',        className: 'badge-open' },
  in_progress: { label: 'In Progress', className: 'badge-in_progress' },
  resolved:    { label: 'Resolved',    className: 'badge-resolved' },
  closed:      { label: 'Closed',      className: 'badge-closed' },
};

const PRIORITY_LABELS = {
  low:    { label: 'Low',    className: 'badge-low' },
  medium: { label: 'Medium', className: 'badge-medium' },
  high:   { label: 'High',   className: 'badge-high' },
  urgent: { label: 'Urgent', className: 'badge-urgent' },
};

const CATEGORIES = [
  'Infrastructure','Academic','Administrative','IT Support',
  'Library','Hostel','Sports','Canteen','Other',
];

// ── KPI Stat Card ──────────────────────────────────────────────
function StatCard({ title, value, icon, accentColor, accentBg, trend }) {
  return (
    <div className="bg-white rounded-xl border border-brand-border shadow-card p-5 flex items-start gap-4 hover:shadow-card-md transition-shadow duration-200">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accentBg, color: accentColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-brand-text leading-none">{value ?? '—'}</p>
        <p className="text-sm text-brand-muted mt-1 font-medium">{title}</p>
      </div>
    </div>
  );
}

// ── Custom Recharts Tooltip ────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-brand-border rounded-lg shadow-card-md px-3 py-2">
      <p className="text-xs text-brand-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-brand-text">{payload[0].value} issues</p>
    </div>
  );
}

// ── Export icon button ─────────────────────────────────────────
function ExportButton({ onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary text-sm"
    >
      {icon}
      {label}
    </button>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page,           setPage]           = useState(1);
  const [pagination,     setPagination]     = useState(null);

  // Inline update
  const [updating, setUpdating] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.get('/tickets/stats'),
        api.get('/tickets', {
          params: {
            status:   filterStatus   || undefined,
            category: filterCategory || undefined,
            page,
            limit: 15,
          },
        }),
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data.tickets);
      setPagination(ticketsRes.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusUpdate = async (ticketId, newStatus) => {
    setUpdating(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      setTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t)
      );
    } catch {
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await api.get(`/export/${format}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary-200 border-t-primary-600" />
          <p className="text-sm text-brand-muted font-medium">Loading campus overview…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start gap-3 rounded-xl bg-danger-light border border-red-200 p-4">
          <svg className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-danger-text text-sm">Failed to load dashboard</p>
            <p className="text-sm text-danger mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const s = stats?.summary || {};

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">Campus Overview</h1>
            <p className="text-brand-muted text-sm mt-1">
              Monitor issues, track progress, and improve campus operations.
            </p>
          </div>
          {/* Export buttons in header on desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <ExportButton
              onClick={() => handleExport('xlsx')}
              label="Export XLSX"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <ExportButton
              onClick={() => handleExport('pdf')}
              label="Export PDF"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Issues"
            value={s.total}
            accentColor="#0F766E"
            accentBg="#E6F7F5"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Open"
            value={s.open}
            accentColor="#C47A16"
            accentBg="#FEF3C7"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="In Progress"
            value={s.in_progress}
            accentColor="#D97745"
            accentBg="#FAEBD7"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
          <StatCard
            title="Resolved"
            value={s.resolved}
            accentColor="#16805B"
            accentBg="#D1FAE5"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Avg Resolution"
            value={s.avg_resolution_hours != null ? `${s.avg_resolution_hours}h` : 'N/A'}
            accentColor="#115E59"
            accentBg="#E6F7F5"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Charts ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Trend chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-brand-text">Issue Trend</h3>
                <p className="text-xs text-brand-muted mt-0.5">Issues raised over the last 30 days</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-primary-600 rounded-full" />
                <span className="text-xs text-brand-muted">Issues</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats?.trend || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E5DF" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 11, fill: '#66736F' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#66736F' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#0F766E', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category pie */}
          <div className="card">
            <div className="mb-5">
              <h3 className="font-semibold text-brand-text">Issues by Category</h3>
              <p className="text-xs text-brand-muted mt-0.5">Distribution across all categories</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.byCategory || []}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {(stats?.byCategory || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: '#66736F' }}>{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(v) => [v, 'Issues']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E3E5DF',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Filters + Mobile Exports ─────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-brand-muted">Filter:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(filterStatus || filterCategory) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterCategory(''); setPage(1); }}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors px-2 py-1"
            >
              Clear filters
            </button>
          )}

          {/* Mobile exports */}
          <div className="sm:hidden ml-auto flex gap-2">
            <button onClick={() => handleExport('xlsx')} className="btn-secondary text-xs py-2">XLSX</button>
            <button onClick={() => handleExport('pdf')} className="btn-secondary text-xs py-2">PDF</button>
          </div>
        </div>

        {/* ── Ticket Table ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-brand-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
            <h3 className="font-semibold text-brand-text">
              Issue Records
            </h3>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-600" />
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F6F4EF' }}>
                  {['Title', 'Category', 'Priority', 'Status', 'Raised By', 'Grouped', 'Date', 'Update Status'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider whitespace-nowrap border-b border-brand-border"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-brand-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm font-medium text-brand-muted">No tickets found</p>
                        <p className="text-xs text-brand-muted">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-primary-50 transition-colors duration-100"
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-brand-text truncate text-sm" title={t.title}>{t.title}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-brand-muted">{t.category}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={PRIORITY_LABELS[t.priority]?.className || 'badge'}>
                        {PRIORITY_LABELS[t.priority]?.label || t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={STATUS_LABELS[t.status]?.className || 'badge'}>
                        {STATUS_LABELS[t.status]?.label || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-brand-muted">
                      {t.raised_by_name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {t.grouped_count > 0 ? (
                        <span className="badge-ai">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          +{t.grouped_count}
                        </span>
                      ) : (
                        <span className="text-brand-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-brand-muted">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={t.status}
                        disabled={updating === t.id}
                        onChange={(e) => handleStatusUpdate(t.id, e.target.value)}
                        className="input-field py-1.5 text-xs w-36 disabled:opacity-60"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-5 py-3 border-t border-brand-border flex items-center justify-between bg-brand-bg">
              <p className="text-xs text-brand-muted">
                Showing page {page} of {pagination.pages} · {pagination.total} total issues
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-xs text-brand-muted font-semibold px-2">
                  {page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
