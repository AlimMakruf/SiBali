// ------------------------------------------------------------
// Token Blacklist Model — Supabase (table: token_blacklist)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const TokenBlacklistModel = {
    /**
     * Add a token JTI to the blacklist.
     * @param {{ tokenJti: string, userId: string, expiresAt: string }} data
     * @returns {object} created record
     */
    async add({ tokenJti, userId, expiresAt }) {
        const { data, error } = await supabase
            .from('token_blacklist')
            .insert({
                token_jti: tokenJti,
                user_id: userId,
                expires_at: expiresAt,
            })
            .select()
            .single();

        if (error) {
            // Ignore duplicate (token already blacklisted)
            if (error.code === '23505') {
                return null;
            }
            throw error;
        }

        return data;
    },

    /**
     * Check if a token JTI is blacklisted.
     * @param {string} tokenJti
     * @returns {boolean}
     */
    async isBlacklisted(tokenJti) {
        const { data, error } = await supabase
            .from('token_blacklist')
            .select('id')
            .eq('token_jti', tokenJti)
            .single();

        if (error && error.code === 'PGRST116') {
            // No rows found — not blacklisted
            return false;
        }
        if (error) throw error;

        return !!data;
    },

    /**
     * Remove expired blacklisted tokens (maintenance cleanup).
     * @returns {number} number of deleted records
     */
    async cleanupExpired() {
        const { data, error } = await supabase
            .from('token_blacklist')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) throw error;

        return data ? data.length : 0;
    },
};

module.exports = TokenBlacklistModel;
