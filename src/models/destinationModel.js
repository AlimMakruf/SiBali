// ------------------------------------------------------------
// Destination Model — Supabase (table: destinations)
// Replaces the old trendingPlaceModel
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const DestinationModel = {
    /**
     * List destinations with optional filters.
     * @param {object} filters
     * @param {string}  [filters.categoryId]
     * @param {boolean} [filters.isTrending]
     * @param {string}  [filters.search] — text search on name
     * @param {number}  [filters.limit=20]
     * @param {number}  [filters.offset=0]
     * @returns {object[]}
     */
    async findAll({ categoryId, isTrending, search, limit = 20, offset = 0 } = {}) {
        let query = supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (categoryId) query = query.eq('category_id', categoryId);
        if (typeof isTrending === 'boolean') query = query.eq('is_trending', isTrending);
        if (search) query = query.ilike('name', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Find a single destination by ID (with category info).
     * @param {string} id
     * @returns {object|null}
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('id', id)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
    /**
     * Find a destination by exact name (case-insensitive).
     * @param {string} name
     * @returns {object|null}
     */
    async findByName(name) {
        const { data, error } = await supabase
            .from('destinations')
            .select('id, name')
            .ilike('name', name)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
    /**
     * Get trending destinations.
     * @param {number} limit
     * @returns {object[]}
     */
    async getTrending(limit = 10) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .eq('is_trending', true)
            .order('rating_avg', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    /**
     * Create a single destination.
     * @param {object} dest
     * @returns {object}
     */
    async create(dest) {
        const { data, error } = await supabase
            .from('destinations')
            .insert(dest)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Bulk upsert destinations from Gemini (trending import).
     * Deactivates old trending, then inserts new batch.
     * Replaces the old TrendingPlaceModel.bulkUpsert().
     * @param {object[]} places
     * @returns {object[]}
     */
    async bulkUpsert(places) {
        // Deactivate old trending places
        const { error: deactivateError } = await supabase
            .from('destinations')
            .update({ is_trending: false, updated_at: new Date().toISOString() })
            .eq('is_trending', true);

        if (deactivateError) throw deactivateError;

        // Insert new batch — map Gemini response to DB columns
        const rows = places.map((p) => ({
            name: p.destinationName || p.name,
            description: p.about || p.description || '',
            area: (p.contactInfo && p.contactInfo.location) || p.location || p.area || null,
            gmaps_url: p.gmapsUrl || p.gmaps_url || null,
            rating_avg: p.rating || null,
            is_trending: true,
            is_active: true,
        }));

        const { data, error } = await supabase
            .from('destinations')
            .insert(rows)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Search destinations by name or description.
     * @param {string} query
     * @param {number} limit
     * @returns {object[]}
     */
    async search(query, limit = 20) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .order('rating_avg', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },
};

module.exports = DestinationModel;
