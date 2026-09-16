// backend/models/User.js
// All SQL for the users table lives here — controllers call these methods only

'use strict';

const pool = require('../config/db');

const User = {
  /**
   * Find a user by email address.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by primary key (UUID).
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, department, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Create a new user record.
   * @param {{ name, email, password, role, department }} data
   * @returns {Promise<object>} Created user (without password)
   */
  async create({ name, email, password, role, department }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, created_at`,
      [name, email, password, role, department]
    );
    return rows[0];
  },

  /**
   * Update the hashed password for a user.
   * @param {string} userId
   * @param {string} hashedPassword
   */
  async updatePassword(userId, hashedPassword) {
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
  },
};

module.exports = User;
