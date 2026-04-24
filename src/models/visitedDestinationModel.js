// ------------------------------------------------------------
// Visited Destination Model — Supabase (table: visited_destinations)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const VisitedDestinationModel = {
    /**
     * Mark a destination as visited.
     * @param {string} userId
     * @param {string} destinationId
     * @returns {object}
     */
    async markVisited(userId, destinationId) {
        const { data, error } = await supabase
            .from('visited_destinations')
            .insert({ user_id: userId, destination_id: destinationId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                const err = new Error('Destination is already marked as visited');
                err.statusCode = 409;
                throw err;
            }
            throw error;
        }
        return data;
    },

    /**
     * Unmark a destination as visited.
     * @param {string} userId
     * @param {string} destinationId
     * @returns {object|null}
     */
    async unmarkVisited(userId, destinationId) {
        const { data, error } = await supabase
            .from('visited_destinations')
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
     * Get all visited destinations for a user (with destination details).
     * @param {string} userId
     * @returns {object[]}
     */
    async getByUserId(userId) {
        const { data, error } = await supabase
            .from('visited_destinations')
            .select('id, visited_at, destinations(id, name, description, area, images, rating_avg, rating_count, categories(id, name))')
            .eq('user_id', userId)
            .order('visited_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Count visited destinations for a user.
     * @param {string} userId
     * @returns {number}
     */
    async countByUserId(userId) {
        const { count, error } = await supabase
            .from('visited_destinations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw error;
        return count || 0;
    },
};

module.exports = VisitedDestinationModel;
