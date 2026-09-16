// backend/routes/authRoutes.js

'use strict';

const express = require('express');
const router  = express.Router();

const {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
} = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register',        register);
router.post('/login',           login);
router.post('/refresh',         refresh);
router.post('/logout',          logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// Protected
router.get('/me', verifyToken, me);

module.exports = router;
