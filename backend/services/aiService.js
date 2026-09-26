// backend/services/aiService.js
// Gemini embedding generation + cosine similarity for ticket grouping

'use strict';

const { GoogleGenAI } = require('@google/genai');

// Lazy-initialise client so missing key doesn't crash startup
let client = null;

function getClient() {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return client;
}

const SIMILARITY_THRESHOLD = 0.82;
const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Compute cosine similarity between two numeric vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} value in [-1, 1]
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);

  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Generate an embedding vector using Gemini.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.trim(),
  });

  return response.embeddings[0].values;
}

/**
 * Main entry point called by ticketController on ticket submit.
 *
 * Generates a Gemini embedding and compares it with
 * embeddings from existing tickets.
 */
async function checkAndEmbed(title, description, existingTickets) {
  try {
    const inputText = `${title}. ${description}`;

    const newEmbedding = await generateEmbedding(inputText);

    let bestMatch = null;
    let bestScore = -1;

    for (const existing of existingTickets) {
      if (!existing.embedding_vector) continue;

      let existingVec;

      try {
        existingVec = JSON.parse(existing.embedding_vector);
      } catch {
        continue;
      }

      const score = cosineSimilarity(newEmbedding, existingVec);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = existing;
      }
    }

    if (bestScore > SIMILARITY_THRESHOLD && bestMatch) {
      return {
        suggestGrouping: true,
        similarTicket: {
          id: bestMatch.id,
          title: bestMatch.title,
          description: bestMatch.description,
          similarityScore: Math.round(bestScore * 100),
        },
        embedding: newEmbedding,
      };
    }

    return {
      suggestGrouping: false,
      embedding: newEmbedding,
    };
  } catch (err) {
    // AI is non-fatal — ticket creation still works if Gemini fails
    console.error('[aiService] Gemini error (non-fatal):', err.message);

    return {
      suggestGrouping: false,
      embedding: null,
    };
  }
}

module.exports = {
  checkAndEmbed,
  generateEmbedding,
  classifyIssue,
};

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

function semanticClassifyFallback(title, description) {
  const combined = `${title} ${description}`.toLowerCase();

  let suggestedPriority = 'medium';
  if (/(danger|hazard|emergency|shock|fire|smoke|spark|burst|collapsed|leakage near electrical|life threatening|urgent|critical|flood)/i.test(combined)) {
    suggestedPriority = 'urgent';
  } else if (/(down|broken|failing|outage|offline|disrupted|all students|entire class|multiple students|severe|blocked|unable to access|exam)/i.test(combined)) {
    suggestedPriority = 'high';
  } else if (/(minor|slow|cosmetic|suggestion|request|enhancement|convenience|small|low priority)/i.test(combined)) {
    suggestedPriority = 'low';
  }

  let suggestedCategory = 'Other';
  let reason = '';

  if (/(hostel|dorm|dormitory|warden|hostel room)/i.test(combined)) {
    suggestedCategory = 'Hostel';
    reason = 'The issue directly concerns student residential housing, amenities, or hostel facilities.';
  } else if (/(canteen|cafeteria|food|meal|lunch|breakfast|dinner|snack|hygiene|dining|canteen vendor)/i.test(combined)) {
    suggestedCategory = 'Canteen';
    reason = 'The report pertains to campus food services, canteen cleanliness, or dining provisions.';
  } else if (/(library|books|study hall|librarian|borrowing book|reading room|journal)/i.test(combined)) {
    suggestedCategory = 'Library';
    reason = 'The issue relates to central library resources, catalogued books, or quiet study spaces.';
  } else if (/(sports|gym|athletics|court|cricket|football|basketball|badminton|tournament|fitness)/i.test(combined)) {
    suggestedCategory = 'Sports';
    reason = 'The report involves campus athletics, sports ground conditions, or recreational facilities.';
  } else if (/(lecture|class|professor|faculty|syllabus|exam|quiz|grading|curriculum|course material|credits)/i.test(combined)) {
    suggestedCategory = 'Academic';
    reason = 'The report involves academic lectures, coursework materials, examinations, or grading.';
  } else if (/(id card|id-card|hall ticket|admit card|fee|fees|scholarship|admission|certificate|transcript|registrar|accounts)/i.test(combined)) {
    suggestedCategory = 'Administrative';
    reason = 'The issue involves institutional administrative processes, identification cards, fees, or documentation.';
  } else if (/(wifi|wi-fi|internet|network|router|ethernet|portal|login|computer|laptop|software|projector|screen|printer|server|dns|dhcp|lan)/i.test(combined)) {
    suggestedCategory = 'IT Support';
    reason = 'The issue involves campus technical systems, network connectivity, or computing infrastructure.';
  } else if (/(water|leak|leakage|ceiling|wall|pipe|plumbing|flush|washroom|toilet|bathroom|door|window|bench|desk|chair|light|bulb|fan|ac|air condition|switch|board|socket|building|block|stairs|elevator|lift|puddle|damage)/i.test(combined)) {
    suggestedCategory = 'Infrastructure';
    reason = 'The issue relates to physical campus buildings, classroom fixtures, utilities, or maintenance.';
  } else {
    suggestedCategory = 'Other';
    reason = 'General campus issue classified based on title and description keywords.';
  }

  return {
    success: true,
    suggestedCategory,
    suggestedPriority,
    reason,
  };
}

/**
 * Classify an issue by title and description using Gemini with semantic fallback.
 * Returns suggested category, priority, and reason.
 * Non-fatal: if Gemini fails or is unconfigured, returns semantic classification.
 *
 * @param {string} title
 * @param {string} description
 * @returns {Promise<{success: boolean, suggestedCategory: string, suggestedPriority: string, reason: string}>}
 */
async function classifyIssue(title, description) {
  try {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      const prompt = `You are an AI assistant for CampusResolve, a college issue tracking system.
Analyze the following college issue report and suggest the single most appropriate category and priority, along with a concise explanation.

Issue Title: ${title}
Issue Description: ${description}

Allowed Categories (choose EXACTLY ONE):
- Infrastructure (physical buildings, classrooms, furniture, water supply, electricity, washrooms, AC/fans, maintenance)
- Academic (lectures, timetable, grading, exams, lab equipment, course materials, faculty queries)
- Administrative (ID cards, fees, scholarships, admissions, documentation, certificates, official requests)
- IT Support (Wi-Fi, campus network, lab computers, portals, software, logins, projectors, printers)
- Library (books, study halls, digital library access, library cards, fines)
- Hostel (rooms, hostel mess food, hostel Wi-Fi, warden issues, dorm plumbing/cleanliness)
- Sports (sports ground, equipment, gym, tournaments, courts)
- Canteen (canteen food quality, pricing, hygiene, canteen facilities)
- Other (anything that does not fit into the categories above)

Allowed Priorities (choose EXACTLY ONE):
- low (minor inconvenience with easy work-arounds)
- medium (noticeable issue affecting normal routine, but work-arounds exist)
- high (significantly impacts operations, academics, or multiple people)
- urgent (critical safety hazard, emergency, or completely blocks access/operations)

Respond strictly with a JSON object in this exact structure:
{
  "suggestedCategory": "<one of the allowed categories listed above>",
  "suggestedPriority": "<one of: low, medium, high, urgent>",
  "reason": "<a short 1-2 sentence explanation justifying the category and priority>"
}`;

      const modelsToTry = [
        process.env.GEMINI_CLASSIFICATION_MODEL,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ].filter(Boolean);

      let response = null;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          response = await getClient().models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
          if (response) break;
        } catch (err) {
          lastError = err;
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('not found') || msg.includes('404')) {
            continue;
          }
          throw err;
        }
      }

      if (response) {
        let text = '';
        if (typeof response.text === 'function') {
          text = response.text();
        } else if (typeof response.text === 'string') {
          text = response.text;
        } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        }

        text = (text || '').trim();
        if (text) {
          const cleanedJson = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);

          const rawCategory = (parsed.suggestedCategory || parsed.category || '').trim();
          const rawPriority = (parsed.suggestedPriority || parsed.priority || '').trim().toLowerCase();

          const matchedCategory = VALID_CATEGORIES.find(
            (c) => c.toLowerCase() === rawCategory.toLowerCase()
          );

          const matchedPriority = VALID_PRIORITIES.find(
            (p) => p.toLowerCase() === rawPriority.toLowerCase()
          );

          if (matchedCategory && matchedPriority) {
            const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
              ? parsed.reason.trim()
              : `The issue relates to ${matchedCategory} and is classified as ${matchedPriority} priority based on the description.`;

            return {
              success: true,
              suggestedCategory: matchedCategory,
              suggestedPriority: matchedPriority,
              reason,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[aiService] Gemini classification call failed, using semantic fallback:', err.message);
  }

  // Fallback to semantic classifier so "Analyze with AI" always returns accurate suggestions
  return semanticClassifyFallback(title, description);
}