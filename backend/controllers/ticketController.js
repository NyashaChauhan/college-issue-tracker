// backend/controllers/ticketController.js
// Ticket CRUD, AI grouping, server-side validation

'use strict';

const Ticket    = require('../models/Ticket');
const aiService = require('../services/aiService');

// ─────────────────────────────────────────────────────────────
// Server-side validation helpers (mirror of frontend validators.js)
// ─────────────────────────────────────────────────────────────

const GIBBERISH_PATTERNS = [
  /^(.)\1{4,}$/i,                 // "aaaaaa"
  /^[qwertyuiop]{6,}$/i,          // top keyboard row
  /^[asdfghjkl]{6,}$/i,           // home keyboard row
  /^[zxcvbnm]{6,}$/i,             // bottom keyboard row
];

function hasLowCharVariety(text) {
  if (text.length <= 10) return false;

  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');

  if (cleaned.length === 0) return true;

  const unique = new Set(cleaned).size;
  return unique / cleaned.length < 0.25;
}

function hasLongConsonantRun(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');

  // Seven or more consonants in a row is very unlikely
  // in a normal English issue description.
  return /[bcdfghjklmnpqrstvwxyz]{7,}/i.test(cleaned);
}

function hasKeyboardMash(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');

  if (cleaned.length < 8) return false;

  const keyboardChars = new Set(
    'qwertyuiopasdfghjklzxcvbnm'
  );

  const keyboardCount = [...cleaned].filter((char) =>
    keyboardChars.has(char)
  ).length;

  // Detect strings that are mostly keyboard characters
  // with very little normal vowel/word structure.
  const vowels = (cleaned.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowels / cleaned.length;

  return keyboardCount / cleaned.length > 0.95 &&
         cleaned.length >= 12 &&
         vowelRatio < 0.15;
}

function hasNoSpacesOnLongText(text) {
  return text.length > 30 && !text.includes(' ');
}

function isGibberish(text) {
  const trimmed = text.trim();

  if (!trimmed) return false;

  if (GIBBERISH_PATTERNS.some((re) => re.test(trimmed))) {
    return true;
  }

  if (hasLowCharVariety(trimmed)) {
    return true;
  }

  if (hasLongConsonantRun(trimmed)) {
    return true;
  }

  if (hasKeyboardMash(trimmed)) {
    return true;
  }

  if (hasNoSpacesOnLongText(trimmed)) {
    return true;
  }

  return false;
}

function validateTitle(title) {
  if (!title || title.trim().length < 5) {
    return 'Title must be at least 5 characters.';
  }

  if (title.trim().length > 200) {
    return 'Title must be at most 200 characters.';
  }

  if (!/[a-zA-Z]/.test(title)) {
    return 'Title must contain letters.';
  }

  if (isGibberish(title)) {
    return 'Title appears to be invalid text.';
  }

  return null;
}

function validateDescription(desc) {
  if (!desc || desc.trim().length < 20) {
    return 'Description must be at least 20 characters.';
  }

  if (desc.trim().length > 2000) {
    return 'Description must be at most 2000 characters.';
  }

  if (isGibberish(desc)) {
    return 'Description appears to be invalid text.';
  }

  return null;
}

const VALID_CATEGORIES = [
  'Infrastructure',
  'Academic',
  'Administrative',
  'IT Support',
  'Library',
  'Hostel',
  'Sports',
  'Canteen',
  'Other',
];

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ─────────────────────────────────────────────────────────────
// POST /api/tickets
// ─────────────────────────────────────────────────────────────
async function createTicket(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      priority,
      confirmGroup,
      parentTicketId,
    } = req.body;

    // ── Server-side validation ────────────────────────────────
    const titleErr = validateTitle(title);
    if (titleErr) {
      return res.status(400).json({ message: titleErr });
    }

    const descErr = validateDescription(description);
    if (descErr) {
      return res.status(400).json({ message: descErr });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category.' });
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority.' });
    }

    // ── Image metadata from Multer/Cloudinary ─────────────────
    const uploadedFiles = req.files || [];

    if (uploadedFiles.length > 3) {
      return res.status(400).json({
        message: 'Maximum 3 images allowed.',
      });
    }

    const images = uploadedFiles.map((f) => ({
      url: f.path,
      public_id: f.filename,
    }));

    const raisedBy = req.user.userId;

    // ── Branch A: user confirmed grouping ─────────────────────
    if (confirmGroup === 'true' || confirmGroup === true) {
      if (!parentTicketId) {
        return res.status(400).json({
          message: 'parentTicketId required when confirming group.',
        });
      }

      const parent = await Ticket.findById(parentTicketId);

      if (!parent) {
        return res.status(404).json({
          message: 'Parent ticket not found.',
        });
      }

      const ticket = await Ticket.create({
        title,
        description,
        category,
        priority,
        raisedBy,
        parentTicketId,
        embeddingVector: null,
      });

      if (images.length) {
        await Ticket.addImages(ticket.id, images);
      }

      return res.status(201).json({
        ticket,
        grouped: true,
      });
    }

    // ── Branch B: explicit standalone (user declined grouping) ─
    if (confirmGroup === 'false' || confirmGroup === false) {
      // Still run embedding so future comparisons work
      const { embedding } = await aiService.checkAndEmbed(
        title,
        description,
        []
      );

      const embeddingJson = embedding
        ? JSON.stringify(embedding)
        : null;

      const ticket = await Ticket.create({
        title,
        description,
        category,
        priority,
        raisedBy,
        parentTicketId: null,
        embeddingVector: embeddingJson,
      });

      if (images.length) {
        await Ticket.addImages(ticket.id, images);
      }

      return res.status(201).json({
        ticket,
        grouped: false,
      });
    }

    // ── Branch C: first submission — run AI check ─────────────
    const existingTickets = await Ticket.findOpenWithEmbeddings();

    const aiResult = await aiService.checkAndEmbed(
      title,
      description,
      existingTickets
    );

    if (aiResult.suggestGrouping) {
      // Do NOT create the ticket yet — return grouping suggestion
      return res.status(200).json({
        suggestGrouping: true,
        similarTicket: aiResult.similarTicket,
      });
    }

    // No similar match — create ticket normally
    const embeddingJson = aiResult.embedding
      ? JSON.stringify(aiResult.embedding)
      : null;

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority,
      raisedBy,
      parentTicketId: null,
      embeddingVector: embeddingJson,
    });

    if (images.length) {
      await Ticket.addImages(ticket.id, images);
    }

    return res.status(201).json({
      ticket,
      grouped: false,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/tickets
// ─────────────────────────────────────────────────────────────
async function listTickets(req, res, next) {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 20,
    } = req.query;

    const opts = {
      status: status || undefined,
      category: category || undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, parseInt(limit, 10) || 20),
    };

    // Students/faculty see only their own tickets
    if (req.user.role !== 'management') {
      opts.raisedBy = req.user.userId;
    }

    const { tickets, total } = await Ticket.findMany(opts);

    return res.json({
      tickets,
      pagination: {
        total,
        page: opts.page,
        limit: opts.limit,
        pages: Math.ceil(total / opts.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/tickets/stats
// Management only — enforced in route
// ─────────────────────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    const stats = await Ticket.getStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/tickets/:id
// ─────────────────────────────────────────────────────────────
async function getTicket(req, res, next) {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found.',
      });
    }

    // Students/faculty can only view their own tickets
    if (
      req.user.role !== 'management' &&
      ticket.raised_by !== req.user.userId
    ) {
      return res.status(403).json({
        message: 'Access denied.',
      });
    }

    return res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/tickets/:id
// Management only — enforced in route
// ─────────────────────────────────────────────────────────────
async function updateTicket(req, res, next) {
  try {
    const { status, assigned_to } = req.body;

    const VALID_STATUSES = [
      'open',
      'in_progress',
      'resolved',
      'closed',
    ];

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status value.',
      });
    }

    const updated = await Ticket.update(req.params.id, {
      status,
      assignedTo: assigned_to,
    });

    if (!updated) {
      return res.status(404).json({
        message: 'Ticket not found.',
      });
    }

    return res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/tickets/analyze
// AI category and priority suggestion
// ─────────────────────────────────────────────────────────────
async function analyzeTicket(req, res, next) {
  try {
    const { title, description } = req.body;

    const titleErr = validateTitle(title);
    if (titleErr) {
      return res.status(400).json({ message: titleErr });
    }

    const descErr = validateDescription(description);
    if (descErr) {
      return res.status(400).json({ message: descErr });
    }

    const result = await aiService.classifyIssue(title.trim(), description.trim());

    if (!result || !result.success) {
      return res.status(503).json({
        message: result?.error || 'AI analysis is currently unavailable. Please select category and priority manually.',
      });
    }

    return res.json({
      suggestedCategory: result.suggestedCategory,
      suggestedPriority: result.suggestedPriority,
      reason: result.reason,
    });
  } catch (err) {
    console.error('[ticketController] analyzeTicket error:', err);
    return res.status(503).json({
      message: 'AI analysis failed. Please select category and priority manually.',
    });
  }
}

module.exports = {
  createTicket,
  listTickets,
  getStats,
  getTicket,
  updateTicket,
  analyzeTicket,
};