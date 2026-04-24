// ------------------------------------------------------------
// User Routes (Protected)
// Profile, interests, saved, visited, stats, reviews
// ------------------------------------------------------------

const { Router } = require('express');
const userProfileController = require('../controllers/userProfileController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');
const { profileUpdateRules, interestRules } = require('../middlewares/validator');

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Profile
router.get('/me/profile', userProfileController.getProfile);
router.put('/me/profile', profileUpdateRules, userProfileController.updateProfile);

// Interests
router.post('/me/interests', interestRules, userProfileController.setInterests);
router.get('/me/interests', userProfileController.getInterests);

// Stats
router.get('/me/stats', userProfileController.getStats);

// Saved destinations
router.get('/me/saved', userProfileController.getSaved);

// Visited destinations
router.get('/me/visited', userProfileController.getVisited);

// User's reviews
router.get('/me/reviews', async (req, res, next) => {
    try {
        const reviewService = require('../services/reviewService');
        const data = await reviewService.getByUser(req.user.id);
        res.status(200).json({ success: true, message: 'Reviews retrieved successfully', data });
    } catch (error) { next(error); }
});

// Delete a review
router.delete('/reviews/:id', reviewController.delete);

module.exports = router;
