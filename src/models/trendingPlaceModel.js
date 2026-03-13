// ------------------------------------------------------------
// Trending Place Model — Supabase (table: trending_places)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const TrendingPlaceModel = {
    /**
     * Get all active trending places.
     * @returns {object[]}
     */
    async getActive() {
        const { data, error } = await supabase
            .from('trending_places')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Bulk upsert trending places from Gemini.
     * Deactivate all old ones, then insert a new batch.
     * @param {object[]} places - Array of { name, description, gmaps_url, category }
     * @returns {object[]}
     */
    async bulkUpsert(places) {
        // Deactivate all old places
        const { error: deactivateError } = await supabase
            .from('trending_places')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('is_active', true);

        if (deactivateError) throw deactivateError;

        // Insert new batch
        const rows = places.map((p) => ({
            name: p.name,
            description: p.description || '',
            gmaps_url: p.gmaps_url || p.gmapsUrl || null,
            category: p.category || null,
            is_active: true,
        }));

        const { data, error } = await supabase
            .from('trending_places')
            .insert(rows)
            .select();

        if (error) throw error;
        return data;
    },
};

module.exports = TrendingPlaceModel;
