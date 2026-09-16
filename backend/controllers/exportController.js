// backend/controllers/exportController.js
// Management-only XLSX and PDF export endpoints

'use strict';

const Ticket        = require('../models/Ticket');
const exportService = require('../services/exportService');

// ─────────────────────────────────────────────────────────────
// GET /api/export/xlsx
// ─────────────────────────────────────────────────────────────
async function exportXlsx(req, res, next) {
  try {
    const { status, category } = req.query;

    const [tickets, stats] = await Promise.all([
      Ticket.findAllForExport({ status, category }),
      Ticket.getStats(),
    ]);

    const buffer = await exportService.buildXlsx(tickets, stats);

    const filename = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/export/pdf
// ─────────────────────────────────────────────────────────────
async function exportPdf(req, res, next) {
  try {
    const { status, category } = req.query;

    const [tickets, stats] = await Promise.all([
      Ticket.findAllForExport({ status, category }),
      Ticket.getStats(),
    ]);

    const buffer = await exportService.buildPdf(tickets, stats);

    const filename = `tickets_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportXlsx, exportPdf };
