// ------------------------------------------------------------
// Saved Destination Model — Supabase (table: saved_destinations)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const SavedDestinationModel = {
    /**
     * Save a destination for a user.
     * @param {string} userId
     * @param {string} destinationId
     * @returns {object}
     */
    async save(userId, destinationId) {
        const { data, error } = await supabase
            .from('saved_destinations')
            .insert({ user_id: userId, destination_id: destinationId })
            .select()
            .single();

        if (error) {
            // Already saved (unique constraint)
            if (error.code === '23505') {
                const err = new Error('Destination is already saved');
                err.statusCode = 409;
                throw err;
            }
            throw error;
        }
        return data;
    },

    /**
     * Unsave a destination for a user.
     * @param {string} userId
     * @param {string} destinationId
     * @returns {object|null}
     */
    async unsave(userId, destinationId) {
        const { data, error } = await supabase
            .from('saved_destinations')
            .delete()
            .eq('user_id', userId)
            .eq('destination_id', destinationId)
            .select()
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },

    /**
     * Get all saved destinations for a user (with destination details).
     * @param {string} userId
     * @returns {object[]}
     */
    async getByUserId(userId) {
        const { data, error } = await supabase
            .from('saved_destinations')
            .select('id, created_at, destinations(id, name, description, area, images, rating_avg, rating_count, categories(id, name))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Check if a destination is saved by a user.
     * @param {string} userId
     * @param {string} destinationId
     * @returns {boolean}
     */
    async isSaved(userId, destinationId) {
        const { data, error } = await supabase
            .from('saved_destinations')
            .select('id')
            .eq('user_id', userId)
            .eq('destination_id', destinationId)
            .single();

        if (error && error.code === 'PGRST116') return false;
        if (error) throw error;
        return !!data;
    },

    /**
     * Count saved destinations for a user.
     * @param {string} userId
     * @returns {number}
     */
    async countByUserId(userId) {
        const { count, error } = await supabase
            .from('saved_destinations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw error;
        return count || 0;
    },
};

module.exports = SavedDestinationModel;
