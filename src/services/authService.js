// ------------------------------------------------------------
// Auth Service — Register & Login logic (Supabase)
// ------------------------------------------------------------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const UserModel = require('../models/userModel');

const SALT_ROUNDS = 10;

/**
 * Generate JWT for user.
 */
function generateToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
}

const authService = {
    /**
     * Register a new user.
     * @param {string} name
     * @param {string} email
     * @param {string} password
     * @returns {{ user: object, token: string }}
     */
    async register(name, email, password) {
        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user in Supabase (duplicate email handled by model)
        const user = await UserModel.create({
            name,
            email: email.toLowerCase(),
            password_hash,
        });

        // Generate token
        const token = generateToken(user.id);

        return { user, token };
    },

    /**
     * Login user.
     * @param {string} email
     * @param {string} password
     * @returns {{ user: object, token: string }}
     */
    async login(email, password) {
        // Find user (including password_hash for verification)
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        // Generate token
        const token = generateToken(user.id);

        // Return user without password_hash
        const { password_hash: _, ...safeUser } = user;
        return { user: safeUser, token };
    },
};

module.exports = authService;
