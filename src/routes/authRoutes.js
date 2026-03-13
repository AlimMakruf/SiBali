// ------------------------------------------------------------
// Auth Routes
// ------------------------------------------------------------

const { Router } = require('express');
const authController = require('../controllers/authController');
const { registerRules, loginRules } = require('../middlewares/validator');

const router = Router();

// POST /api/auth/register
router.post('/register', registerRules, authController.register);

// POST /api/auth/login
router.post('/login', loginRules, authController.login);

module.exports = router;
