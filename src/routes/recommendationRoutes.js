// ------------------------------------------------------------
// Recommendation Routes (Protected by JWT)
// ------------------------------------------------------------

const { Router } = require('express');
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { searchRules } = require('../middlewares/validator');

const router = Router();

// All routes below require authentication
router.use(authMiddleware);

// GET /api/recommendations/trending
router.get('/trending', recommendationController.getTrending);

// POST /api/recommendations/search
router.post('/search', searchRules, recommendationController.search);

module.exports = router;
