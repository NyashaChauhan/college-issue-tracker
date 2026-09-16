// backend/models/Ticket.js
// All SQL for tickets, ticket_images, refresh_tokens, password_reset_tokens lives here

'use strict';

const pool = require('../config/db');

const Ticket = {
  // ──────────────────────────────────────────────────────────
  // TICKET CRUD
  // ──────────────────────────────────────────────────────────

  /**
   * Create a new ticket.
   * @param {{ title, description, category, priority, raisedBy, parentTicketId, embeddingVector }} data
   * @returns {Promise<object>}
   */
  async create({ title, description, category, priority, raisedBy, parentTicketId = null, embeddingVector = null }) {
    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, category, priority, raised_by, parent_ticket_id, embedding_vector)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, category, priority, raisedBy, parentTicketId, embeddingVector]
    );
    return rows[0];
  },

  /**
   * Find a ticket by id, including its images and grouped children.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT t.*,
              u.name  AS raised_by_name,
              u.role  AS raised_by_role,
              u.department AS raised_by_department,
              a.name  AS assigned_to_name
       FROM tickets t
       LEFT JOIN users u ON t.raised_by    = u.id
       LEFT JOIN users a ON t.assigned_to  = a.id
       WHERE t.id = $1`,
      [id]
    );
    if (!rows[0]) return null;

    const ticket = rows[0];

    // Attach images
    const imgResult = await pool.query(
      'SELECT id, image_url, public_id, created_at FROM ticket_images WHERE ticket_id = $1 ORDER BY created_at',
      [id]
    );
    ticket.images = imgResult.rows;

    // Attach grouped children
    const childResult = await pool.query(
      `SELECT t.id, t.title, t.created_at, u.name AS raised_by_name, u.role AS raised_by_role
       FROM tickets t
       LEFT JOIN users u ON t.raised_by = u.id
       WHERE t.parent_ticket_id = $1
       ORDER BY t.created_at`,
      [id]
    );
    ticket.grouped_tickets = childResult.rows;

    return ticket;
  },

  /**
   * List tickets for the list view with pagination and filters.
   * Returns parent tickets only (parent_ticket_id IS NULL).
   * Management sees all; students/faculty see only their own (raisedBy filter).
   *
   * @param {{ raisedBy?, status?, category?, page, limit }} opts
   * @returns {Promise<{ tickets: object[], total: number }>}
   */
  async findMany({ raisedBy, status, category, page = 1, limit = 20 }) {
    const conditions = ['t.parent_ticket_id IS NULL'];
    const params = [];
    let idx = 1;

    if (raisedBy) {
      conditions.push(`t.raised_by = $${idx++}`);
      params.push(raisedBy);
    }
    if (status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`t.category = $${idx++}`);
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tickets t ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT t.*,
              u.name       AS raised_by_name,
              u.role       AS raised_by_role,
              u.department AS raised_by_department,
              a.name       AS assigned_to_name,
              (SELECT COUNT(*) FROM tickets c WHERE c.parent_ticket_id = t.id)::int AS grouped_count,
              (SELECT COUNT(*) FROM ticket_images i WHERE i.ticket_id = t.id)::int  AS image_count
       FROM tickets t
       LEFT JOIN users u ON t.raised_by   = u.id
       LEFT JOIN users a ON t.assigned_to = a.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams
    );

    return { tickets: rows, total };
  },

  /**
   * Update status and/or assigned_to for a ticket (management only).
   * @param {string} id
   * @param {{ status?, assignedTo? }} data
   * @returns {Promise<object|null>}
   */
  async update(id, { status, assignedTo }) {
    const fields = [];
    const params = [];
    let idx = 1;

    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(status);
    }
    if (assignedTo !== undefined) {
      fields.push(`assigned_to = $${idx++}`);
      params.push(assignedTo || null);
    }

    if (!fields.length) return null;

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  /**
   * Fetch all open parent tickets that have an embedding_vector stored.
   * Used by the AI grouping layer for similarity comparison.
   * @returns {Promise<object[]>}
   */
  async findOpenWithEmbeddings() {
    const { rows } = await pool.query(
      `SELECT id, title, description, embedding_vector
       FROM tickets
       WHERE status = 'open'
         AND parent_ticket_id IS NULL
         AND embedding_vector IS NOT NULL`
    );
    return rows;
  },

  /**
   * Store the embedding vector for a ticket.
   * @param {string} id
   * @param {string} embeddingJson  JSON.stringify(number[])
   */
  async saveEmbedding(id, embeddingJson) {
    await pool.query(
      'UPDATE tickets SET embedding_vector = $1 WHERE id = $2',
      [embeddingJson, id]
    );
  },

  // ──────────────────────────────────────────────────────────
  // TICKET IMAGES
  // ──────────────────────────────────────────────────────────

  /**
   * Persist Cloudinary upload results for a ticket.
   * @param {string} ticketId
   * @param {{ url: string, public_id: string }[]} images
   */
  async addImages(ticketId, images) {
    for (const img of images) {
      await pool.query(
        'INSERT INTO ticket_images (ticket_id, image_url, public_id) VALUES ($1, $2, $3)',
        [ticketId, img.url, img.public_id]
      );
    }
  },

  // ──────────────────────────────────────────────────────────
  // STATS (management dashboard)
  // ──────────────────────────────────────────────────────────

  /**
   * Returns aggregate stats for the management dashboard.
   * @returns {Promise<{ summary, byCategory, trend }>}
   */
  async getStats() {
    // Summary totals
    const summaryResult = await pool.query(`
      SELECT
        COUNT(*)                                                                          AS total,
        COUNT(*) FILTER (WHERE status = 'open')                                          AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress')                                  AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved')                                      AS resolved,
        COUNT(*) FILTER (WHERE status = 'closed')                                        AS closed,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0
          ) FILTER (WHERE status IN ('resolved', 'closed'))
        , 2) AS avg_resolution_hours
      FROM tickets
      WHERE parent_ticket_id IS NULL
    `);

    // By category
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM tickets
      WHERE parent_ticket_id IS NULL
      GROUP BY category
      ORDER BY count DESC
    `);

    // Trend: last 30 days
    const trendResult = await pool.query(`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') AS date,
        COUNT(*)::int                        AS count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND parent_ticket_id IS NULL
      GROUP BY date
      ORDER BY date
    `);

    return {
      summary:    summaryResult.rows[0],
      byCategory: categoryResult.rows,
      trend:      trendResult.rows,
    };
  },

  // ──────────────────────────────────────────────────────────
  // REFRESH TOKENS
  // ──────────────────────────────────────────────────────────

  async saveRefreshToken(userId, token, expiresAt) {
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
  },

  async findRefreshToken(token) {
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [token]
    );
    return rows[0] || null;
  },

  async deleteRefreshToken(token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  },

  async deleteAllRefreshTokensForUser(userId) {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },

  // ──────────────────────────────────────────────────────────
  // PASSWORD RESET TOKENS
  // ──────────────────────────────────────────────────────────

  async savePasswordResetToken(userId, token, expiresAt) {
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
  },

  async findPasswordResetToken(token) {
    const { rows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    return rows[0] || null;
  },

  async markPasswordResetTokenUsed(id) {
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [id]
    );
  },

  // ──────────────────────────────────────────────────────────
  // EXPORT (management)
  // ──────────────────────────────────────────────────────────

  /**
   * Fetch all parent tickets with full user info for export.
   * @param {{ status?, category? }} filters
   * @returns {Promise<object[]>}
   */
  async findAllForExport({ status, category } = {}) {
    const conditions = ['t.parent_ticket_id IS NULL'];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`t.category = $${idx++}`);
      params.push(category);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.category, t.priority, t.status,
              t.created_at, t.updated_at,
              u.name       AS raised_by_name,
              u.role       AS raised_by_role,
              u.department AS raised_by_department,
              (SELECT COUNT(*) FROM tickets c WHERE c.parent_ticket_id = t.id)::int AS grouped_count
       FROM tickets t
       LEFT JOIN users u ON t.raised_by = u.id
       ${where}
       ORDER BY t.created_at DESC`,
      params
    );
    return rows;
  },
};

module.exports = Ticket;
