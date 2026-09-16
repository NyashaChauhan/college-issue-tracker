// backend/controllers/authController.js
// Handles all auth endpoints: register, login, refresh, logout,
// forgot-password, reset-password, me

'use strict';

const crypto  = require('crypto');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const User            = require('../models/User');
const Ticket          = require('../models/Ticket');   // refresh + reset token SQL lives here
const emailService    = require('../services/emailService');

const SALT_ROUNDS     = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

function validatePassword(password) {
  if (!password || password.length === 0) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (password.length > 128) {
    return 'Password must be at most 128 characters.';
  }

  if (/\s/.test(password)) {
    return 'Password must not contain spaces.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }

  return null;
}


// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function signAccessToken(userId, role) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * Parse a JWT expiry string like '7d' or '15m' into milliseconds
 * so we can store the absolute expiry timestamp in the DB.
 */
function parseExpiry(str) {
  const unit  = str.slice(-1);
  const value = parseInt(str.slice(0, -1), 10);
  const map   = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (map[unit] || 1000);
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   parseExpiry(REFRESH_EXPIRES),
    path:     '/api/auth',
  });
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { name, role, department, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    // Management accounts must be created via SQL — never via self-registration
    if (!name || !email || !role || !department || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (role === 'management') {
      return res.status(403).json({ message: 'Management accounts cannot be self-registered.' });
    }
    if (!['student', 'faculty'].includes(role)) {
      return res.status(400).json({ message: 'Role must be student or faculty.' });
    }

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      return res.status(400).json({ message: passwordErr });
    }

    const VALID_DEPARTMENTS = [
      'CSE',
      'AIML',
      'ISE',
      'CSBS',
      'EEE',
      'ECE',
      'Mechanical',
    ];

    if (!VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Invalid department.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, password: hashedPassword, role, department });

    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findByEmail(email);

    // Same error message for wrong email OR wrong password — prevents enumeration
    const INVALID_MSG = 'Invalid email or password.';

    if (!user) {
      // Still run bcrypt to prevent timing attacks
      await bcrypt.compare(password, '$2b$10$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json({ message: INVALID_MSG });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: INVALID_MSG });
    }

    const accessToken  = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + parseExpiry(REFRESH_EXPIRES));
    await Ticket.saveRefreshToken(user.id, refreshToken, expiresAt);

    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ code: 'NO_TOKEN', message: 'No refresh token.' });
    }

    // Verify JWT signature
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' });
    }

    // Check DB for token (handles logout/revocation)
    const stored = await Ticket.findRefreshToken(token);
    if (!stored) {
      return res.status(401).json({ code: 'TOKEN_REVOKED', message: 'Refresh token revoked.' });
    }
    if (new Date(stored.expires_at) < new Date()) {
      await Ticket.deleteRefreshToken(token);
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Refresh token expired.' });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const newAccessToken = signAccessToken(user.id, user.role);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await Ticket.deleteRefreshToken(token);
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Always return the same message — prevents email enumeration
    const SAFE_MSG = 'If an account exists for that email, a reset link has been sent.';

    const user = await User.findByEmail(email);
    if (user) {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await Ticket.savePasswordResetToken(user.id, rawToken, expiresAt);

      try {
        await emailService.sendPasswordResetEmail(user.email, user.name, rawToken);
      } catch (emailErr) {
        console.error('[forgotPassword] Email send failed:', emailErr.message);
        // Still return safe message — don't reveal email send failure
      }
    }

    return res.json({ message: SAFE_MSG });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      return res.status(400).json({ message: passwordErr });
    }

    const record = await Ticket.findPasswordResetToken(token);
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }
    if (record.used) {
      return res.status(400).json({ message: 'This reset link has already been used.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await User.updatePassword(record.user_id, hashed);
    await Ticket.markPasswordResetTokenUsed(record.id);

    // Invalidate all existing refresh tokens for security
    await Ticket.deleteAllRefreshTokensForUser(record.user_id);

    return res.json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, me };
