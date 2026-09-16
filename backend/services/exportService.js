// backend/services/exportService.js
// XLSX (ExcelJS) and PDF (PDFKit) generation for management export

'use strict';

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ── Status colour mapping ────────────────────────────────────
const STATUS_COLORS = {
  open:        { argb: 'FFFFF9C4' },   // yellow
  in_progress: { argb: 'FFBBDEFB' },   // blue
  resolved:    { argb: 'FFC8E6C9' },   // green
  closed:      { argb: 'FFE0E0E0' },   // grey
};

const HEADER_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
const HEADER_FONT  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const SUMMARY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

/**
 * Build an XLSX buffer for the given ticket rows.
 * @param {object[]} tickets  Rows from Ticket.findAllForExport()
 * @param {object}   stats    From Ticket.getStats()
 * @returns {Promise<Buffer>}
 */
async function buildXlsx(tickets, stats) {
  const workbook  = new ExcelJS.Workbook();
  workbook.creator  = 'College Issue Tracker';
  workbook.created  = new Date();

  const sheet = workbook.addWorksheet('Tickets', {
    views: [{ state: 'frozen', ySplit: 1 }],  // freeze header row
  });

  // ── Column definitions ──────────────────────────────────────
  sheet.columns = [
    { header: 'Title',         key: 'title',         width: 40 },
    { header: 'Category',      key: 'category',      width: 18 },
    { header: 'Priority',      key: 'priority',      width: 12 },
    { header: 'Status',        key: 'status',        width: 14 },
    { header: 'Raised By',     key: 'raised_by',     width: 22 },
    { header: 'Role',          key: 'role',          width: 12 },
    { header: 'Department',    key: 'department',    width: 20 },
    { header: 'Grouped Count', key: 'grouped_count', width: 15 },
    { header: 'Raised On',     key: 'raised_on',     width: 20 },
    { header: 'Last Updated',  key: 'last_updated',  width: 20 },
  ];

  // ── Style header row ────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow.height = 22;

  // ── Auto-filter ──────────────────────────────────────────────
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: sheet.columns.length },
  };

  // ── Data rows ────────────────────────────────────────────────
  for (const t of tickets) {
    const row = sheet.addRow({
      title:         t.title,
      category:      t.category,
      priority:      t.priority,
      status:        t.status,
      raised_by:     t.raised_by_name || '—',
      role:          t.raised_by_role || '—',
      department:    t.raised_by_department || '—',
      grouped_count: t.grouped_count || 0,
      raised_on:     t.created_at ? new Date(t.created_at).toLocaleString() : '—',
      last_updated:  t.updated_at  ? new Date(t.updated_at).toLocaleString() : '—',
    });

    // Color-code by status
    const statusKey = (t.status || '').replace(' ', '_');
    const fill = STATUS_COLORS[statusKey] || STATUS_COLORS['closed'];
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
    });
  }

  // ── Summary row ──────────────────────────────────────────────
  const s = stats.summary;
  sheet.addRow([]);   // blank separator
  const summaryRow = sheet.addRow([
    `Total: ${s.total}  |  Open: ${s.open}  |  In Progress: ${s.in_progress}  |  Resolved: ${s.resolved}  |  Closed: ${s.closed}  |  Avg Resolution: ${s.avg_resolution_hours || 'N/A'} hrs`,
  ]);
  summaryRow.getCell(1).font  = { bold: true, size: 11 };
  summaryRow.getCell(1).fill  = SUMMARY_FILL;
  sheet.mergeCells(summaryRow.number, 1, summaryRow.number, sheet.columns.length);

  return workbook.xlsx.writeBuffer();
}

/**
 * Build a PDF buffer for the given ticket rows and stats.
 * Page 1: Header banner + summary cards + category breakdown
 * Page 2+: Ticket table (max 40 rows note)
 * @param {object[]} tickets
 * @param {object}   stats
 * @returns {Promise<Buffer>}
 */
async function buildPdf(tickets, stats) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = doc.page.width  - 80;  // content width (margins)
    const s      = stats.summary;

    // ── Page 1: Header banner ───────────────────────────────
    doc.rect(40, 40, PAGE_W, 60).fill('#2563EB');
    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('College Issue Tracker — Report', 55, 58);

    doc
      .fillColor('#93C5FD')
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, 55, 85);

    // ── Summary cards ───────────────────────────────────────
    doc.moveDown(3);
    const cardLabels = [
      { label: 'Total',       value: s.total       || 0 },
      { label: 'Open',        value: s.open        || 0 },
      { label: 'In Progress', value: s.in_progress || 0 },
      { label: 'Resolved',    value: s.resolved    || 0 },
    ];

    const cardW   = 110;
    const cardH   = 60;
    const cardGap = 10;
    let   cardX   = 40;
    const cardY   = 120;

    cardLabels.forEach(({ label, value }) => {
      doc.rect(cardX, cardY, cardW, cardH).fillAndStroke('#EFF6FF', '#BFDBFE');
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(22)
         .text(String(value), cardX, cardY + 10, { width: cardW, align: 'center' });
      doc.fillColor('#374151').font('Helvetica').fontSize(9)
         .text(label, cardX, cardY + 40, { width: cardW, align: 'center' });
      cardX += cardW + cardGap;
    });

    // Avg resolution
    const avgY = cardY + cardH + 10;
    doc.fillColor('#374151').font('Helvetica').fontSize(10)
       .text(
         `Avg Resolution Time: ${s.avg_resolution_hours || 'N/A'} hours`,
         40, avgY
       );

    // ── Category breakdown ──────────────────────────────────
    const catY0 = avgY + 25;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(13)
       .text('Issues by Category', 40, catY0);

    let catBarY = catY0 + 20;
    const maxCount = Math.max(...(stats.byCategory.map((c) => c.count)), 1);

    stats.byCategory.forEach(({ category, count }) => {
      const barW = Math.round((count / maxCount) * 250);
      doc.rect(120, catBarY, barW, 14).fill('#3B82F6');
      doc.fillColor('#374151').font('Helvetica').fontSize(9)
         .text(category, 40,  catBarY + 2, { width: 78 })
         .text(String(count), 378, catBarY + 2, { width: 30 });
      catBarY += 20;
    });

    // ── Page 2: Ticket table ────────────────────────────────
    doc.addPage();

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14)
       .text('Ticket List', 40, 40);

    const COL_WIDTHS  = [180, 80, 60, 80, 100];
    const COL_HEADERS = ['Title', 'Category', 'Priority', 'Status', 'Raised By'];
    const TABLE_START = 65;
    const ROW_H       = 18;
    const MAX_ROWS    = 40;

    let tx = 40;
    let ty = TABLE_START;

    // Header row
    doc.rect(40, ty, PAGE_W, ROW_H).fill('#2563EB');
    COL_HEADERS.forEach((h, i) => {
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
         .text(h, tx + 3, ty + 4, { width: COL_WIDTHS[i], ellipsis: true });
      tx += COL_WIDTHS[i];
    });

    ty += ROW_H;
    const displayTickets = tickets.slice(0, MAX_ROWS);

    displayTickets.forEach((t, rowIdx) => {
      tx = 40;
      const bgColor = rowIdx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      doc.rect(40, ty, PAGE_W, ROW_H).fill(bgColor);

      const cells = [
        t.title,
        t.category,
        t.priority,
        t.status,
        t.raised_by_name || '—',
      ];

      cells.forEach((val, i) => {
        doc.fillColor('#111827').font('Helvetica').fontSize(8)
           .text(String(val || ''), tx + 3, ty + 4, { width: COL_WIDTHS[i] - 6, ellipsis: true });
        tx += COL_WIDTHS[i];
      });

      ty += ROW_H;

      // Add new page if running out of space
      if (ty > doc.page.height - 60 && rowIdx < displayTickets.length - 1) {
        doc.addPage();
        ty = 40;
      }
    });

    if (tickets.length > MAX_ROWS) {
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9)
         .text(
           `Note: ${tickets.length - MAX_ROWS} additional tickets not shown. Use XLSX export for complete data.`,
           40, ty + 10
         );
    }

    doc.end();
  });
}

module.exports = { buildXlsx, buildPdf };
