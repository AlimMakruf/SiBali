// ------------------------------------------------------------
// Gemini Service — Google Gemini API Integration + Supabase Cache
// Updated: now uses destinations table instead of trending_places
// ------------------------------------------------------------

const config = require('../config/config');
const SearchCacheModel = require('../models/searchCacheModel');
const SearchHistoryModel = require('../models/searchHistoryModel');
const DestinationModel = require('../models/destinationModel');

/**
 * Helper — send a prompt to Gemini via OpenRouter and parse the JSON response.
 */
async function askGemini(prompt) {
    if (!config.openrouter.apiKey) {
        const err = new Error(
            'OPENROUTER_API_KEY is not configured. Add it to the .env file'
        );
        err.statusCode = 503;
        throw err;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.openrouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sibali.com', // Optional, for OpenRouter rankings
            'X-Title': 'SiBali', // Optional, for OpenRouter rankings
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('OpenRouter API Error:', errText);
        const err = new Error('Failed to generate content from AI via OpenRouter');
        err.statusCode = response.status;
        throw err;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

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
     * 1) Check the destinations table (is_trending = true)
     * 2) If empty, call Gemini and save to DB
     */
    async getTrendingPlaces() {
        // Check from database first
        const existing = await DestinationModel.getTrending();
        if (existing && existing.length > 0) {
            return { source: 'database', data: existing };
        }

        // No active data — call Gemini
        const prompt = `You are the AI recommendation engine for a Bali tourism application named SIBALI.

        Your task is to act as a local expert and provide 10 tourist places that are currently trending/viral in Bali.

        Return ONLY a valid JSON array of 10 objects with the exact following structure and keys. Do not include markdown formatting like \`\`\`json or any conversational text outside the JSON block. Ensure the geographical data (latitude, longitude, and map URL) is as accurate as possible.

        [
        {
            "destinationName": "String (The name of the location)",
            "category": "String (e.g., Temple, Beach, Waterfall)",
            "rating": "Number (A realistic rating between 4.0 and 5.0)",
            "reviewCount": "Number (A realistic number of reviews)",
            "aiInsight": "String (A short, engaging paragraph of 2-3 sentences. Focus on the best time to visit, photography tips, and unique experiences. Write it in an inviting tone.)",
            "about": "String (A factual, brief description of the location's history and significance.)",
            "contactInfo": {
            "location": "String (The general address, e.g., Beraban, Tabanan Regency, Bali)",
            "hours": "String (e.g., 'Open until 6:00 PM')",
            "phone": "String (Contact number, or null if generally unavailable)",
            "website": "String (Official website domain, or null if unavailable)"
            },
            "coordinates": {
            "latitude": "Number (The exact latitude of the destination)",
            "longitude": "Number (The exact longitude of the destination)"
            },
            "gmapsUrl": "String (A direct, clickable Google Maps URL for the location, e.g., 'https://www.google.com/maps/search/?api=1&query=latitude,longitude' or a direct place link)",
            "amenities": [
            "Array of Strings (e.g., 'Parking', 'WiFi', 'Guided Tours')"
            ],
            "imageCarouselCount": "Number (Default to 3)"
        }
        ]`.trim();

        const geminiData = await askGemini(prompt);

        // Save to database
        const places = Array.isArray(geminiData) ? geminiData : [];
        if (places.length > 0) {
            const saved = await DestinationModel.bulkUpsert(places);
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
        const prompt = `You are the AI recommendation engine for a Bali tourism application named SIBALI. I will provide you with the name of a destination or some basic raw information about a place in Bali. 

        Your task is to act as a local expert and generate a comprehensive, structured JSON object to populate the "Destination Detail" screen in our React Native app.

        Here is the destination information to process: 
        "${keyword}"

        Return ONLY a valid JSON object with the exact following structure and keys. Do not include markdown formatting like \`\`\`json or any conversational text outside the JSON block. Ensure the geographical data (latitude, longitude, and map URL) is as accurate as possible.

        {
        "destinationName": "String (The name of the location)",
        "category": "String (e.g., Temple, Beach, Waterfall)",
        "rating": "Number (A realistic rating between 4.0 and 5.0)",
        "reviewCount": "Number (A realistic number of reviews)",
        "aiInsight": "String (A short, engaging paragraph of 2-3 sentences. Focus on the best time to visit, photography tips, and unique experiences. Write it in an inviting tone.)",
        "about": "String (A factual, brief description of the location's history and significance.)",
        "contactInfo": {
            "location": "String (The general address, e.g., Beraban, Tabanan Regency, Bali)",
            "hours": "String (e.g., 'Open until 6:00 PM')",
            "phone": "String (Contact number, or null if generally unavailable)",
            "website": "String (Official website domain, or null if unavailable)"
        },
        "coordinates": {
            "latitude": "Number (The exact latitude of the destination)",
            "longitude": "Number (The exact longitude of the destination)"
        },
        "gmapsUrl": "String (A direct, clickable Google Maps URL for the location, e.g., 'https://www.google.com/maps/search/?api=1&query=latitude,longitude' or a direct place link)",
        "amenities": [
            "Array of Strings (e.g., 'Parking', 'WiFi', 'Guided Tours')"
        ],
        "imageCarouselCount": "Number (Default to 3)"
        }`;

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

    /**
     * Generate an AI itinerary based on discovery inputs.
     * @param {object} inputs - The user's discovery step inputs
     */
    async generateItineraryFromDiscovery(inputs) {
        const prompt = `You are the AI recommendation engine for a Bali tourism application named SIBALI.

Your task is to generate a comprehensive, structured itinerary for a trip to Bali based on the following user preferences:

- Duration: ${inputs.durationDays} days${inputs.durationNights ? `, ${inputs.durationNights} nights` : ''}
- Interests: ${inputs.interests.join(', ')}
- Budget Range: ${inputs.budgetRange || 'Not specified'}
- Group: ${inputs.adults} adults${inputs.children ? `, ${inputs.children} children` : ''}
- Preferred Area: ${inputs.area || 'Anywhere in Bali'}
- Special Requests: ${inputs.specialRequests || 'None'}
- Custom Preferences: ${inputs.customPreferences || 'None'}

Return ONLY a valid JSON object with the exact following structure. Do not include markdown formatting like \`\`\`json or any conversational text.

{
  "title": "String (A catchy title for this itinerary)",
  "description": "String (A short summary of the trip)",
  "days": [
    {
      "dayNumber": "Number (e.g., 1)",
      "items": [
        {
          "visitTime": "String (Suggested time, e.g., '09:00 AM')",
          "notes": "String (Why this place fits the user's preferences)",
          "destination": {
            "destinationName": "String",
            "category": "String",
            "rating": "Number (Between 4.0 and 5.0)",
            "reviewCount": "Number",
            "aiInsight": "String (2-3 sentences)",
            "about": "String",
            "contactInfo": {
              "location": "String",
              "hours": "String",
              "phone": "String (or null)",
              "website": "String (or null)"
            },
            "coordinates": {
              "latitude": "Number",
              "longitude": "Number"
            },
            "gmapsUrl": "String",
            "amenities": ["Array of Strings"],
            "imageCarouselCount": "Number (Default 3)"
          }
        }
      ]
    }
  ]
}`;

        return await askGemini(prompt.trim());
    },
};

module.exports = geminiService;
