// frontend/src/pages/TicketsPage.jsx
// CampusResolve — Students/faculty: "My Issues" list + "Raise Issue" toggle.
// Management: full ticket list with inline status update.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import RaiseTicketForm from '../components/ticket/RaiseTicketForm';

// ── Badge helpers ─────────────────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: 'Open',        className: 'badge-open' },
  in_progress: { label: 'In Progress', className: 'badge-in_progress' },
  resolved:    { label: 'Resolved',    className: 'badge-resolved' },
  closed:      { label: 'Closed',      className: 'badge-closed' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    className: 'badge-low' },
  medium: { label: 'Medium', className: 'badge-medium' },
  high:   { label: 'High',   className: 'badge-high' },
  urgent: { label: 'Urgent', className: 'badge-urgent' },
};

// Left border color for priority
const PRIORITY_BORDER = {
  low:    '#E3E5DF',
  medium: '#0F766E',
  high:   '#D97745',
  urgent: '#C94A4A',
};

const CATEGORIES = [
  'Infrastructure', 'Academic', 'Administrative', 'IT Support',
  'Library', 'Hostel', 'Sports', 'Canteen', 'Other',
];

// ── Ticket Card ───────────────────────────────────────────────
function TicketCard({ ticket, isManagement, onStatusChange, updating, onExpand }) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    if (!expanded) onExpand(ticket.id);
    setExpanded((v) => !v);
  };

  const priorityBorder = PRIORITY_BORDER[ticket.priority] || '#E3E5DF';

  return (
    <div
      className="bg-white rounded-xl border border-brand-border shadow-card
                  hover:shadow-card-md transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ borderLeft: `3px solid ${priorityBorder}` }}
      onClick={handleExpand}
    >
      {/* ── Card Header ── */}
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-start gap-2 justify-between">

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-text text-[0.95rem] leading-snug truncate">
              {ticket.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {/* Category chip */}
              <span className="text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-full px-2.5 py-0.5">
                {ticket.category}
              </span>
              <span className="text-brand-border">·</span>
              <span className="text-xs text-brand-muted">
                {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              {ticket.raised_by_name && (
                <>
                  <span className="text-brand-border">·</span>
                  <span className="text-xs text-brand-muted">{ticket.raised_by_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right-side badges + expand toggle */}
          <div className="flex flex-wrap gap-1.5 items-center flex-shrink-0">
            <span className={STATUS_CONFIG[ticket.status]?.className || 'badge'}>
              {STATUS_CONFIG[ticket.status]?.label || ticket.status}
            </span>
            <span className={PRIORITY_CONFIG[ticket.priority]?.className || 'badge'}>
              {PRIORITY_CONFIG[ticket.priority]?.label || ticket.priority}
            </span>

            {/* AI grouped indicator */}
            {ticket.grouped_count > 0 && (
              <span className="badge-ai">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Grouped · +{ticket.grouped_count}
              </span>
            )}

            {/* Image count */}
            {ticket.image_count > 0 && (
              <span className="badge bg-gray-50 text-brand-muted border border-brand-border">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {ticket.image_count}
              </span>
            )}

            {/* Expand chevron */}
            <span className="text-brand-muted ml-1">
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div
          className="border-t border-brand-border px-5 py-4 space-y-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: '#FAFAF8' }}
        >
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Department */}
          {ticket.raised_by_department && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs text-brand-muted">
                {ticket.raised_by_department}
              </span>
            </div>
          )}

          {/* Image attachments */}
          {ticket.images && ticket.images.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                Attachments ({ticket.images.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="group relative"
                  >
                    <img
                      src={img.image_url}
                      alt="Attachment"
                      className="h-20 w-20 object-cover rounded-lg border border-brand-border
                                  group-hover:opacity-80 group-hover:shadow-card-md
                                  transition-all duration-150"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors duration-150 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Parent issue — shown when this ticket was grouped */}
          {ticket.parent_ticket && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <svg
                  className="w-3.5 h-3.5 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7"
                  />
                </svg>

                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  AI-Grouped With Existing Issue
                </p>
              </div>

              <p className="text-sm font-medium text-brand-text">
                {ticket.parent_ticket.title}
              </p>

              <p className="text-xs text-brand-muted mt-1">
                Originally reported by {ticket.parent_ticket.raised_by_name}
                {' '}({ticket.parent_ticket.raised_by_role})
              </p>
            </div>
          )}

          {/* Grouped / linked issues */}
          {ticket.grouped_tickets && ticket.grouped_tickets.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  AI-Linked Issues ({ticket.grouped_tickets.length})
                </p>
              </div>
              <ul className="space-y-1.5">
                {ticket.grouped_tickets.map((g) => (
                  <li
                    key={g.id}
                    className="text-xs text-brand-muted bg-white border border-brand-border
                                rounded-lg px-3 py-2 flex items-start gap-2"
                  >
                    <svg className="w-3 h-3 text-brand-border mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    <span>
                      <span className="font-medium text-brand-text">{g.title}</span>
                      {' — '}
                      <span>by {g.raised_by_name} ({g.raised_by_role})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Management status updater */}
          {isManagement && (
            <div
              className="flex items-center gap-3 pt-2 border-t border-brand-border"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="text-xs font-semibold text-brand-muted flex-shrink-0">
                Update Status:
              </label>
              <select
                value={ticket.status}
                disabled={updating === ticket.id}
                onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="input-field py-1.5 text-xs w-44 disabled:opacity-60"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              {updating === ticket.id && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-200 border-t-primary-600" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TicketsPage ───────────────────────────────────────────────
export default function TicketsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'management';

  const [view, setView]         = useState('list');
  const [tickets, setTickets]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [updating, setUpdating] = useState(null);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/tickets', {
        params: {
          status:   filterStatus   || undefined,
          category: filterCategory || undefined,
          page,
          limit: 10,
        },
      });
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, page]);

  // Cache individual ticket details (images + grouped issues)
  const [detailCache, setDetailCache] = useState({});

  const loadDetail = useCallback(async (id) => {
    if (detailCache[id]) return;
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setDetailCache((prev) => ({ ...prev, [id]: data.ticket }));
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    }
  }, [detailCache]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdating(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      setDetailCache((prev) => {
        if (!prev[ticketId]) return prev;
        return { ...prev, [ticketId]: { ...prev[ticketId], status: newStatus } };
      });
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  const handleRaiseSuccess = (msg) => {
    setSuccessMsg(msg);
    setView('list');
    loadTickets();
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Enrich list tickets with cached detail data
  const enriched = tickets.map((t) => ({ ...t, ...(detailCache[t.id] || {}) }));

  const hasActiveFilters = filterStatus || filterCategory;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">
              {isManagement ? 'All Issues' : 'My Issues'}
            </h1>
            <p className="text-brand-muted text-sm mt-0.5">
              {isManagement
                ? 'Manage and update campus-wide issue reports.'
                : 'Track the issues you have submitted.'}
            </p>
          </div>

          {/* Student/faculty tab switcher */}
          {!isManagement && (
            <div className="flex items-center gap-1 p-1 bg-white border border-brand-border rounded-xl shadow-card">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  view === 'list'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                }`}
              >
                My Issues
              </button>
              <button
                onClick={() => setView('raise')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                  view === 'raise'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Raise Issue
              </button>
            </div>
          )}
        </div>

        {/* ── Success Banner ── */}
        {successMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-success-light border border-green-200 px-4 py-3 animate-fade-in">
            <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-success-text">{successMsg}</p>
          </div>
        )}

        {/* ── Raise Issue Form ── */}
        {view === 'raise' && !isManagement && (
          <div className="card mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-text leading-none">Report a new issue</h2>
                <p className="text-xs text-brand-muted mt-0.5">Describe the problem clearly so it can be resolved quickly.</p>
              </div>
            </div>
            <RaiseTicketForm onSuccess={handleRaiseSuccess} />
          </div>
        )}

        {/* ── Ticket List ── */}
        {(view === 'list' || isManagement) && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
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

              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterCategory(''); setPage(1); }}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors px-2 py-1.5"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-danger-light border border-red-200 px-4 py-3 mb-5">
                <svg className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-primary-200 border-t-primary-600" />
                <p className="text-sm text-brand-muted font-medium">Loading issues…</p>
              </div>

            /* Empty state */
            ) : enriched.length === 0 ? (
              <div className="card text-center py-14">
                <div className="w-14 h-14 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-brand-text mb-1">
                  {hasActiveFilters ? 'No matching issues' : 'No issues yet'}
                </h3>
                <p className="text-sm text-brand-muted mb-5">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : !isManagement
                      ? 'You haven\'t reported any issues yet. Raise your first one now.'
                      : 'No issues have been submitted yet.'}
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={() => { setFilterStatus(''); setFilterCategory(''); setPage(1); }}
                    className="btn-secondary inline-flex"
                  >
                    Clear filters
                  </button>
                ) : !isManagement && (
                  <button
                    onClick={() => setView('raise')}
                    className="btn-primary inline-flex"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Raise Your First Issue
                  </button>
                )}
              </div>

            /* Ticket list */
            ) : (
              <div className="space-y-3">
                {enriched.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    isManagement={isManagement}
                    onStatusChange={handleStatusChange}
                    updating={updating}
                    onExpand={loadDetail}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-brand-border">
                <p className="text-xs text-brand-muted">
                  Page {page} of {pagination.pages} · {pagination.total} total issues
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-brand-muted font-semibold px-1">
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
          </>
        )}
      </div>
    </div>
  );
}