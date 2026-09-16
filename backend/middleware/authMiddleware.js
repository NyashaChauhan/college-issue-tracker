// backend/middleware/authMiddleware.js
// JWT verification and role-based access control

'use strict';

const jwt = require('jsonwebtoken');

/**
 * verifyToken
 * Reads the Bearer token from the Authorization header, verifies it with
 * JWT_ACCESS_SECRET, and attaches { userId, role } to req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'NO_TOKEN', message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Access token expired.' });
    }
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid access token.' });
  }
}

/**
 * requireRole(...roles)
 * Factory that returns middleware enforcing role restrictions.
 * Usage: requireRole('management') or requireRole('student', 'faculty')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
