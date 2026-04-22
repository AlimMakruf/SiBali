// ------------------------------------------------------------
// Auth Routes
// ------------------------------------------------------------

const { Router } = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { registerRules, loginRules, refreshTokenRules } = require('../middlewares/validator');

const router = Router();

// POST /api/auth/register
router.post('/register', registerRules, authController.register);

// POST /api/auth/login
router.post('/login', loginRules, authController.login);

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshTokenRules, authController.refreshToken);

// GET /api/auth/me — check if JWT is active & get user data
router.get('/me', authMiddleware, authController.me);

// POST /api/auth/logout — invalidate tokens
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
