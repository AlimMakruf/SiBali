// ------------------------------------------------------------
// Review Model — Supabase (table: reviews)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const ReviewModel = {
    /**
     * Create or update a review (upsert on user_id + destination_id).
     * @param {{ userId: string, destinationId: string, rating: number, comment?: string }} data
     * @returns {object}
     */
    async upsert({ userId, destinationId, rating, comment }) {
        const { data, error } = await supabase
            .from('reviews')
            .upsert(
                {
                    user_id: userId,
                    destination_id: destinationId,
                    rating,
                    comment: comment || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,destination_id' }
            )
            .select('*')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get reviews for a destination with user info.
     * @param {string} destinationId
     * @param {number} limit
     * @param {number} offset
     * @returns {object[]}
     */
    async getByDestinationId(destinationId, limit = 20, offset = 0) {
        const { data, error } = await supabase
            .from('reviews')
            .select('id, rating, comment, created_at, updated_at, users(id, name, profile_photo)')
            .eq('destination_id', destinationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data;
    },

    /**
     * Get reviews by a user.
     * @param {string} userId
     * @returns {object[]}
     */
    async getByUserId(userId) {
        const { data, error } = await supabase
            .from('reviews')
            .select('id, rating, comment, created_at, updated_at, destinations(id, name, images)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Delete a review.
     * @param {string} id — review ID
     * @param {string} userId — must match the review owner
     * @returns {object|null}
     */
    async delete(id, userId) {
        const { data, error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = ReviewModel;
