// ------------------------------------------------------------
// Interest Model — Supabase (table: interests)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const InterestModel = {
    /**
     * Get all active interests.
     * @returns {object[]}
     */
    async getAll() {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Find interest by ID.
     * @param {string} id
     * @returns {object|null}
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('interests')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = InterestModel;
