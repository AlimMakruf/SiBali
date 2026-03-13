// ------------------------------------------------------------
// Gemini Service — Google Gemini API Integration + Supabase Cache
// ------------------------------------------------------------

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');
const SearchCacheModel = require('../models/searchCacheModel');
const SearchHistoryModel = require('../models/searchHistoryModel');
const TrendingPlaceModel = require('../models/trendingPlaceModel');

/**
 * Initialize Gemini client.
 * Will be null if API key is not set.
 */
let genAI = null;
let model = null;

if (config.gemini.apiKey) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

/**
 * Helper — send a prompt to Gemini and parse the JSON response.
 */
async function askGemini(prompt) {
    if (!model) {
        const err = new Error(
            'GEMINI_API_KEY is not configured. Add it to the .env file'
        );
        err.statusCode = 503;
        throw err;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Gemini often returns markdown code-blocks, we strip them
    const jsonString = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    try {
        return JSON.parse(jsonString);
    } catch {
        // If parsing fails, return as raw text
        return { raw: text };
    }
}

// ============ Service Methods ============

const geminiService = {
    /**
     * Get a list of trending/viral tourist places in Bali.
     * 1) Check the trending_places table (is_active = true)
     * 2) If empty, call Gemini and save to DB
     */
    async getTrendingPlaces() {
        // Check from database first
        const existing = await TrendingPlaceModel.getActive();
        if (existing && existing.length > 0) {
            return { source: 'database', data: existing };
        }

        // No active data — call Gemini
        const prompt = `
You are a Bali tourism expert. Provide 10 tourist places that are currently trending/viral in Bali.

Return ONLY in the following JSON array format, without any additional explanation:
[
  {
    "name": "Place Name",
    "description": "Brief description of why this place is trending",
    "category": "Beach/Temple/Nature/Culture/Culinary/Adventure",
    "gmaps_url": "https://maps.google.com/..."
  }
]
    `.trim();

        const geminiData = await askGemini(prompt);

        // Save to database
        const places = Array.isArray(geminiData) ? geminiData : [];
        if (places.length > 0) {
            const saved = await TrendingPlaceModel.bulkUpsert(places);
            return { source: 'gemini', data: saved };
        }

        return { source: 'gemini', data: geminiData };
    },

    /**
     * Search for tourism recommendations based on keyword and parameters.
     * 1) Check search_caches by keyword
     * 2) If hit & still valid, use cache
     * 3) If miss, call Gemini and save to cache
     * 4) Record to search_histories
     *
     * @param {object} params
     * @param {string} params.keyword
     * @param {string} [params.category]
     * @param {string} [params.budget]
     * @param {string} params.userId — for tracking history
     */
    async searchRecommendations({ keyword, category, budget, userId }) {
        const normalizedKeyword = keyword.toLowerCase().trim();

        // 1) Check cache
        const cached = await SearchCacheModel.findByKeyword(normalizedKeyword);
        if (cached) {
            // Record search history
            await SearchHistoryModel.create(userId, normalizedKeyword, cached.id);
            return { source: 'cache', data: cached.ai_response };
        }

        // 2) Cache miss — call Gemini
        let prompt = `
You are a Bali tourism expert. Provide tourist place recommendations in Bali based on the following criteria:

Keyword: "${keyword}"`;

        if (category) prompt += `\nKategori: "${category}"`;
        if (budget) prompt += `\nBudget: "${budget}"`;

        prompt += `

Return ONLY in the following JSON array format (maximum 10 places), without any additional explanation:
[
  {
    "name": "Place Name",
    "location": "Regency/City",
    "category": "Beach/Temple/Nature/Culture/Culinary/Adventure",
    "description": "Brief description of the place and why it is recommended",
    "rating": 4.5,
    "estimatedBudget": "IDR 50,000 - IDR 100,000",
    "tips": "Brief tips for visitors",
    "gmaps_url": "https://maps.google.com/..."
  }
]`;

        const geminiData = await askGemini(prompt.trim());

        // 3) Save to cache
        const cacheRecord = await SearchCacheModel.upsert(
            normalizedKeyword,
            geminiData
        );

        // 4) Record search history
        await SearchHistoryModel.create(userId, normalizedKeyword, cacheRecord.id);

        return { source: 'gemini', data: geminiData };
    },
};

module.exports = geminiService;
