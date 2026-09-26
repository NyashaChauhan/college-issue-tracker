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

/**
 * Classify an issue by title and description using Gemini.
 * Returns suggested category, priority, and reason.
 * Non-fatal: if Gemini fails or is unconfigured, returns an error result.
 *
 * @param {string} title
 * @param {string} description
 * @returns {Promise<{success: boolean, suggestedCategory?: string, suggestedPriority?: string, reason?: string, error?: string}>}
 */
async function classifyIssue(title, description) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('[aiService] GEMINI_API_KEY is not configured.');
      return {
        success: false,
        error: 'AI analysis service is unavailable (API key not configured). Please select category and priority manually.',
      };
    }

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
        // Try fallback model if the specified model is not found
        if (msg.includes('not found') || msg.includes('404')) {
          continue;
        }
        throw err;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    let text = '';
    if (response && typeof response.text === 'function') {
      text = response.text();
    } else if (response && typeof response.text === 'string') {
      text = response.text;
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    }

    text = (text || '').trim();
    if (!text) {
      throw new Error('Empty response received from Gemini.');
    }

    // Strip markdown code fences if present
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

    if (!matchedCategory) {
      throw new Error(`Invalid category returned by Gemini: "${rawCategory}"`);
    }

    if (!matchedPriority) {
      throw new Error(`Invalid priority returned by Gemini: "${rawPriority}"`);
    }

    const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : `The issue relates to ${matchedCategory} and is classified as ${matchedPriority} priority based on the description.`;

    return {
      success: true,
      suggestedCategory: matchedCategory,
      suggestedPriority: matchedPriority,
      reason,
    };
  } catch (err) {
    console.error('[aiService] Issue classification error (non-fatal):', err.message);
    return {
      success: false,
      error: 'AI analysis failed or is unavailable. Please select category and priority manually.',
    };
  }
}