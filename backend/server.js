// backend/server.js
// Entry point — loads env, initialises Express, mounts all routes

'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const authRoutes   = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin:      process.env.COLLEGE_DOMAIN || 'http://localhost:3000',
  credentials: true,           // required for httpOnly cookie exchange
}));

// ── Rate limiting ────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message: { message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ── Parsers ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── HTTP request logging (dev only) ─────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/export',  exportRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error.',
  });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV})`);
});
