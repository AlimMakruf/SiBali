// ------------------------------------------------------------
// User Interest Model — Supabase (table: user_interests)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const UserInterestModel = {
    /**
     * Set user interests (replace all existing).
     * Deletes old interests first, then inserts the new set.
     * @param {string} userId
     * @param {string[]} interestIds — array of interest UUIDs
     * @returns {object[]} inserted records
     */
    async setInterests(userId, interestIds) {
        // Delete existing interests for this user
        const { error: deleteError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Insert new interests
        const rows = interestIds.map((interestId) => ({
            user_id: userId,
            interest_id: interestId,
        }));

        const { data, error } = await supabase
            .from('user_interests')
            .insert(rows)
            .select('id, user_id, interest_id, created_at');

        if (error) throw error;
        return data;
    },

    /**
     * Get user interests with interest details.
     * @param {string} userId
     * @returns {object[]}
     */
    async getByUserId(userId) {
        const { data, error } = await supabase
            .from('user_interests')
            .select('id, interest_id, created_at, interests(id, name, icon_url)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },
};

module.exports = UserInterestModel;
