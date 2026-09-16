// backend/config/db.js
// PostgreSQL connection pool using node-postgres (pg)

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Keep at most 20 connections, close idle ones after 30 s
  max:             20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fail fast if the DB is unreachable at startup
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

module.exports = pool;
