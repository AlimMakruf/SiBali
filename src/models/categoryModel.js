// ------------------------------------------------------------
// Category Model — Supabase (table: categories)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const CategoryModel = {
    /**
     * Get all active categories.
     * @returns {object[]}
     */
    async getAll() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Find category by ID.
     * @param {string} id
     * @returns {object|null}
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = CategoryModel;
