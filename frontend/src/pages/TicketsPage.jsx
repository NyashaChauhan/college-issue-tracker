// frontend/src/pages/TicketsPage.jsx
// Students/faculty: toggle between "My Issues" list and "Raise Issue" form.
// Management: full ticket list with inline status update.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import RaiseTicketForm from '../components/ticket/RaiseTicketForm';

const STATUS_LABELS = {
  open: {
    label: 'Open',
    className: 'badge-open',
  },
  in_progress: {
    label: 'In Progress',
    className: 'badge-in_progress',
  },
  resolved: {
    label: 'Resolved',
    className: 'badge-resolved',
  },
  closed: {
    label: 'Closed',
    className: 'badge-closed',
  },
};

const PRIORITY_LABELS = {
  low: {
    label: 'Low',
    className: 'badge-low',
  },
  medium: {
    label: 'Medium',
    className: 'badge-medium',
  },
  high: {
    label: 'High',
    className: 'badge-high',
  },
  urgent: {
    label: 'Urgent',
    className: 'badge-urgent',
  },
};

// ── Ticket Card ──────────────────────────────────────────────
function TicketCard({
  ticket,
  isManagement,
  onStatusChange,
  updating,
  onExpand,
}) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    if (!expanded) {
      onExpand(ticket.id);
    }

    setExpanded((v) => !v);
  };

  return (
    <div
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleExpand}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {ticket.title}
          </p>

          <p className="text-xs text-gray-500 mt-0.5">
            {ticket.category} ·{' '}
            {new Date(ticket.created_at).toLocaleDateString()}
            {ticket.raised_by_name && ` · By ${ticket.raised_by_name}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center flex-shrink-0">
          <span
            className={
              STATUS_LABELS[ticket.status]?.className || 'badge'
            }
          >
            {STATUS_LABELS[ticket.status]?.label || ticket.status}
          </span>

          <span
            className={
              PRIORITY_LABELS[ticket.priority]?.className || 'badge'
            }
          >
            {PRIORITY_LABELS[ticket.priority]?.label || ticket.priority}
          </span>

          {ticket.grouped_count > 0 && (
            <span className="badge bg-indigo-100 text-indigo-700">
              +{ticket.grouped_count} others
            </span>
          )}

          {ticket.image_count > 0 && (
            <span className="badge bg-gray-100 text-gray-600">
              📎 {ticket.image_count}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="mt-3 border-t border-gray-100 pt-3 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {ticket.description}
          </p>

          {ticket.raised_by_department && (
            <p className="text-xs text-gray-500">
              Department: {ticket.raised_by_department}
            </p>
          )}

          {/* Image attachments */}
          {ticket.images && ticket.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {ticket.images.map((img) => (
                <a
                  key={img.id}
                  href={img.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={img.image_url}
                    alt="Attachment"
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Grouped Issues */}
          {ticket.grouped_tickets &&
            ticket.grouped_tickets.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Grouped Issues:
                </p>

                <ul className="space-y-1">
                  {ticket.grouped_tickets.map((g) => (
                    <li
                      key={g.id}
                      className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1"
                    >
                      {g.title} — by {g.raised_by_name} (
                      {g.raised_by_role})
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Management status updater */}
          {isManagement && (
            <div
              className="mt-3 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="text-xs font-medium text-gray-600">
                Update Status:
              </label>

              <select
                value={ticket.status}
                disabled={updating === ticket.id}
                onChange={(e) =>
                  onStatusChange(ticket.id, e.target.value)
                }
                className="input-field py-1 text-xs w-40"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TicketsPage ──────────────────────────────────────────────
export default function TicketsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'management';

  const [view, setView] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [updating, setUpdating] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/tickets', {
        params: {
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          page,
          limit: 10,
        },
      });

      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load tickets.'
      );
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, page]);

  // Cache individual ticket details.
  // The detail endpoint contains the actual image URLs and grouped issues.
  const [detailCache, setDetailCache] = useState({});

  const loadDetail = useCallback(
    async (id) => {
      if (detailCache[id]) {
        return;
      }

      try {
        const { data } = await api.get(`/tickets/${id}`);

        setDetailCache((prev) => ({
          ...prev,
          [id]: data.ticket,
        }));
      } catch (err) {
        console.error('Failed to load ticket details:', err);
      }
    },
    [detailCache]
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdating(ticketId);

    try {
      await api.patch(`/tickets/${ticketId}`, {
        status: newStatus,
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: newStatus }
            : t
        )
      );

      // Also update the cached detail if it has already been loaded.
      setDetailCache((prev) => {
        if (!prev[ticketId]) {
          return prev;
        }

        return {
          ...prev,
          [ticketId]: {
            ...prev[ticketId],
            status: newStatus,
          },
        };
      });
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  const handleRaiseSuccess = (msg) => {
    setSuccessMsg(msg);
    setView('list');
    loadTickets();

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Enrich list tickets with their cached detail data.
  // This adds ticket.images when the ticket has been expanded.
  const enriched = tickets.map((t) => ({
    ...t,
    ...(detailCache[t.id] || {}),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {isManagement ? 'All Issues' : 'My Issues'}
        </h1>

        {!isManagement && (
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={
                view === 'list'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              My Issues
            </button>

            <button
              onClick={() => setView('raise')}
              className={
                view === 'raise'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              + Raise Issue
            </button>
          </div>
        )}
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">
            {successMsg}
          </p>
        </div>
      )}

      {/* ── Raise Issue Form ── */}
      {view === 'raise' && !isManagement && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Raise a New Issue
          </h2>

          <RaiseTicketForm onSuccess={handleRaiseSuccess} />
        </div>
      )}

      {/* ── Ticket List ── */}
      {(view === 'list' || isManagement) && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="input-field w-auto text-sm"
            >
              <option value="">All Categories</option>

              {[
                'Infrastructure',
                'Academic',
                'Administrative',
                'IT Support',
                'Library',
                'Hostel',
                'Sports',
                'Canteen',
                'Other',
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Ticket cards */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : enriched.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-2">
                No issues found.
              </p>

              {!isManagement && (
                <button
                  onClick={() => setView('raise')}
                  className="btn-primary mt-2"
                >
                  Raise Your First Issue
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                {pagination.total} total
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                  disabled={page === 1}
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  Previous
                </button>

                <span className="text-xs text-gray-600 self-center">
                  {page} / {pagination.pages}
                </span>

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(pagination.pages, p + 1)
                    )
                  }
                  disabled={page === pagination.pages}
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}