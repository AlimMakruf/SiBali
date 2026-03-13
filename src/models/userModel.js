// ------------------------------------------------------------
// User Model — Supabase (table: users)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const UserModel = {
    /**
     * Create a new user.
     * @param {{ name: string, email: string, password_hash: string }} data
     * @returns {object} user without password_hash
     */
    async create({ name, email, password_hash }) {
        const { data, error } = await supabase
            .from('users')
            .insert({ name, email, password_hash })
            .select('id, name, email, created_at')
            .single();

        if (error) {
            // Duplicate email (unique constraint)
            if (error.code === '23505') {
                const err = new Error('Email is already registered');
                err.statusCode = 409;
                throw err;
            }
            throw error;
        }

        return data;
    },

    /**
     * Find user by email (including password_hash for verification).
     * @param {string} email
     * @returns {object|null}
     */
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, password_hash, created_at')
            .eq('email', email.toLowerCase())
            .single();

        if (error && error.code === 'PGRST116') {
            // No rows found
            return null;
        }
        if (error) throw error;

        return data;
    },

    /**
     * Find user by ID (without password_hash).
     * @param {string} id
     * @returns {object|null}
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, created_at')
            .eq('id', id)
            .single();

        if (error && error.code === 'PGRST116') {
            return null;
        }
        if (error) throw error;

        return data;
    },
};

module.exports = UserModel;
