// frontend/src/components/dashboard/Dashboard.jsx
// Management-only dashboard with stat cards, charts, and filterable ticket table.

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../utils/api';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

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

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ title, value, icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      </div>
    </div>
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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const s = stats?.summary || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Issues"
          value={s.total}
          color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          title="Open"
          value={s.open}
          color="bg-yellow-100"
          icon={<svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="In Progress"
          value={s.in_progress}
          color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        />
        <StatCard
          title="Resolved"
          value={s.resolved}
          color="bg-green-100"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Avg Resolution"
          value={s.avg_resolution_hours != null ? `${s.avg_resolution_hours}h` : 'N/A'}
          color="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart: trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Issues Raised – Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats?.trend || []} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(d) => new Date(d).toLocaleDateString()}
                formatter={(v) => [v, 'Issues']}
              />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: by category */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Issues by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats?.byCategory || []}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(stats?.byCategory || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v) => [v, 'Issues']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filters + Export ── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field w-auto"
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
          className="input-field w-auto"
        >
          <option value="">All Categories</option>
          {['Infrastructure','Academic','Administrative','IT Support','Library','Hostel','Sports','Canteen','Other'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button onClick={() => handleExport('xlsx')} className="btn-secondary text-sm">
            Export XLSX
          </button>
          <button onClick={() => handleExport('pdf')} className="btn-secondary text-sm">
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Ticket Table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Title', 'Category', 'Priority', 'Status', 'Raised By', 'Grouped', 'Date', 'Update Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No tickets found.
                  </td>
                </tr>
              ) : tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-800 truncate" title={t.title}>{t.title}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{t.category}</td>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{t.raised_by_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600">
                    {t.grouped_count > 0 ? `+${t.grouped_count}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={t.status}
                      disabled={updating === t.id}
                      onChange={(e) => handleStatusUpdate(t.id, e.target.value)}
                      className="input-field py-1 text-xs w-36"
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
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {pagination.total} total tickets
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600 self-center">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
