// ------------------------------------------------------------
// Search History Model — Supabase (table: search_histories)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const SearchHistoryModel = {
    /**
     * Record a user's search history.
     * @param {string} userId
     * @param {string} keywordSearched
     * @param {string|null} cacheId
     * @returns {object}
     */
    async create(userId, keywordSearched, cacheId = null) {
        const { data, error } = await supabase
            .from('search_histories')
            .insert({
                user_id: userId,
                keyword_searched: keywordSearched,
                cache_id: cacheId,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get a user's search history.
     * @param {string} userId
     * @param {number} limit
     * @returns {object[]}
     */
    async findByUserId(userId, limit = 20) {
        const { data, error } = await supabase
            .from('search_histories')
            .select('*, search_caches(keyword, ai_response)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },
};

module.exports = SearchHistoryModel;
