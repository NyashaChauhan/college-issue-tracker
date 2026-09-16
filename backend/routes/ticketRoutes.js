// backend/routes/ticketRoutes.js
// IMPORTANT: uploadImages middleware MUST come before controller functions
// for multipart/form-data to be parsed by Multer.

'use strict';

const express = require('express');
const router  = express.Router();

const {
  createTicket,
  listTickets,
  getStats,
  getTicket,
  updateTicket,
} = require('../controllers/ticketController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadImages }             = require('../middleware/uploadMiddleware');

// All ticket routes require authentication
router.use(verifyToken);

// Stats — management only; must come BEFORE /:id to avoid "stats" being matched as an id
router.get('/stats', requireRole('management'), getStats);

// List & create
router.get('/',  listTickets);

// Multer MUST run before createTicket so req.files is populated
router.post('/', uploadImages, createTicket);

// Single ticket
router.get('/:id', getTicket);

// Update (management only)
router.patch('/:id', requireRole('management'), updateTicket);

module.exports = router;
