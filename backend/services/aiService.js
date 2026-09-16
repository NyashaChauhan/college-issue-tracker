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
};