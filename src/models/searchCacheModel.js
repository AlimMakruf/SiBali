// ------------------------------------------------------------
// Search Cache Model — Supabase (table: search_caches)
// ------------------------------------------------------------

const supabase = require('../config/supabase');
const config = require('../config/config');

const SearchCacheModel = {
    /**
     * Find cache by keyword.
     * Only return if still within TTL (30 minutes).
     * @param {string} keyword
     * @returns {object|null}
     */
    async findByKeyword(keyword) {
        const { data, error } = await supabase
            .from('search_caches')
            .select('*')
            .eq('keyword', keyword.toLowerCase().trim())
            .single();

        if (error && error.code === 'PGRST116') {
            return null; // Not found
        }
        if (error) throw error;

        // Check if cache is still valid (TTL 30 minutes)
        const updatedAt = new Date(data.updated_at).getTime();
        const now = Date.now();
        if (now - updatedAt > config.cache.searchTTL) {
            return null; // Expired
        }

        return data;
    },

    /**
     * Save or update cache.
     * @param {string} keyword
     * @param {object} aiResponse
     * @returns {object} cache record
     */
    async upsert(keyword, aiResponse) {
        const normalizedKeyword = keyword.toLowerCase().trim();

        const { data, error } = await supabase
            .from('search_caches')
            .upsert(
                {
                    keyword: normalizedKeyword,
                    ai_response: aiResponse,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'keyword' }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

module.exports = SearchCacheModel;
