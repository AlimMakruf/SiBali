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

    /**
     * Find a category by fuzzy name match (case-insensitive).
     * Useful for mapping Gemini's category strings (e.g. "Beach", "Temple")
     * to the actual category record in the DB.
     * @param {string} name
     * @returns {object|null}
     */
    async findByNameFuzzy(name) {
        if (!name) return null;
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .eq('is_active', true)
            .ilike('name', `%${name.trim()}%`)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new category.
     * @param {string} name
     * @returns {object}
     */
    async create(name) {
        const { data, error } = await supabase
            .from('categories')
            .insert({ name: name.trim(), is_active: true })
            .select('id, name')
            .single();

        if (error) throw error;
        console.log(`📁 [Category] Auto-created new category: "${data.name}" (${data.id})`);
        return data;
    },

    /**
     * Find a category by fuzzy name match, or create it if no match exists.
     * @param {string} name - Category name from Gemini (e.g. "Beach Club", "Water Park")
     * @returns {object} - { id, name }
     */
    async findOrCreate(name) {
        if (!name) return null;

        // Try fuzzy match first
        const found = await this.findByNameFuzzy(name);
        if (found) return found;

        // No match — create a new category
        return this.create(name);
    },
};

module.exports = CategoryModel;
