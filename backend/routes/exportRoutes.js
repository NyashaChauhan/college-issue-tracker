// backend/routes/exportRoutes.js

'use strict';

const express = require('express');
const router  = express.Router();

const { exportXlsx, exportPdf } = require('../controllers/exportController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All export routes: must be authenticated AND management role
router.use(verifyToken);
router.use(requireRole('management'));

router.get('/xlsx', exportXlsx);
router.get('/pdf',  exportPdf);

module.exports = router;
