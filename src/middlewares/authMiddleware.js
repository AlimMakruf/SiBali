// ------------------------------------------------------------
// Auth Middleware — Protect routes with JWT (Async/Supabase)
// ------------------------------------------------------------

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const UserModel = require('../models/userModel');

/**
 * Middleware to verify JWT token.
 * Extracts token from header: Authorization: Bearer <token>
 * If valid, sets req.user with user data from Supabase.
 */
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Token not found.',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Find user in Supabase
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.',
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
        }
        next(error);
    }
}

module.exports = authMiddleware;
