const express = require('express');
const router = express.Router();
const discoveryController = require('../controllers/discoveryController');
const authMiddleware = require('../middlewares/authMiddleware');
const { discoveryRules } = require('../middlewares/validator');

// Protected route for AI itinerary generation
router.post('/generate-itinerary', authMiddleware, discoveryRules, discoveryController.generate);

module.exports = router;
