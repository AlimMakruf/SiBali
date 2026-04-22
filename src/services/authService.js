// ------------------------------------------------------------
// Auth Service — Register, Login, Refresh, Logout, CheckUser
// ------------------------------------------------------------

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const UserModel = require('../models/userModel');
const TokenBlacklistModel = require('../models/tokenBlacklistModel');

const SALT_ROUNDS = 10;

/**
 * Generate a unique JWT ID (jti) for token tracking.
 */
function generateJti() {
    return crypto.randomUUID();
}

/**
 * Generate access token (short-lived) for user.
 */
function generateAccessToken(userId) {
    return jwt.sign({ id: userId, jti: generateJti() }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
}

/**
 * Generate refresh token (long-lived) for user.
 */
function generateRefreshToken(userId) {
    return jwt.sign({ id: userId, jti: generateJti() }, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
}

const authService = {
    /**
     * Register a new user.
     * @param {string} name
     * @param {string} email
     * @param {string} password
     * @returns {{ user: object, accessToken: string, refreshToken: string }}
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

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        return { user, accessToken, refreshToken };
    },

    /**
     * Login user.
     * @param {string} email
     * @param {string} password
     * @returns {{ user: object, accessToken: string, refreshToken: string }}
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

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Return user without password_hash
        const { password_hash: _, ...safeUser } = user;
        return { user: safeUser, accessToken, refreshToken };
    },

    /**
     * Refresh access token using a valid refresh token.
     * @param {string} token — the refresh token
     * @returns {{ user: object, accessToken: string }}
     */
    async refreshToken(token) {
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.refreshSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                const err = new Error('Refresh token has expired. Please log in again.');
                err.statusCode = 401;
                throw err;
            }
            const err = new Error('Invalid refresh token.');
            err.statusCode = 401;
            throw err;
        }

        // Check if refresh token is blacklisted
        const isBlacklisted = await TokenBlacklistModel.isBlacklisted(decoded.jti);
        if (isBlacklisted) {
            const err = new Error('Refresh token has been revoked. Please log in again.');
            err.statusCode = 401;
            throw err;
        }

        // Find user in database
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 401;
            throw err;
        }

        // Generate new access token
        const accessToken = generateAccessToken(user.id);

        return { user, accessToken };
    },

    /**
     * Logout — blacklist both access token and refresh token JTIs.
     * @param {string} accessTokenJti — JTI from the current access token
     * @param {string} accessTokenExp — expiry timestamp of access token
     * @param {string} refreshToken — the raw refresh token string
     * @param {string} userId — ID of the authenticated user
     */
    async logout(accessTokenJti, accessTokenExp, refreshToken, userId) {
        // Blacklist the access token
        await TokenBlacklistModel.add({
            tokenJti: accessTokenJti,
            userId,
            expiresAt: new Date(accessTokenExp * 1000).toISOString(),
        });

        // If refresh token is provided, decode and blacklist it too
        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
                await TokenBlacklistModel.add({
                    tokenJti: decoded.jti,
                    userId,
                    expiresAt: new Date(decoded.exp * 1000).toISOString(),
                });
            } catch {
                // Refresh token is already expired or invalid — no need to blacklist
            }
        }
    },

    /**
     * Check user — return user data for the authenticated user.
     * @param {string} userId
     * @returns {{ user: object }}
     */
    async checkUser(userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }
        return { user };
    },
};

module.exports = authService;
