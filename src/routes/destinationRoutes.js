// ------------------------------------------------------------
// Destination Routes
// Some public, some protected
// ------------------------------------------------------------

const { Router } = require('express');
const destinationController = require('../controllers/destinationController');
const reviewController = require('../controllers/reviewController');
const userProfileController = require('../controllers/userProfileController');
const authMiddleware = require('../middlewares/authMiddleware');
const { reviewRules } = require('../middlewares/validator');

const router = Router();

// --- Public routes ---
// GET /api/destinations
router.get('/', destinationController.getAll);

// GET /api/destinations/trending
router.get('/trending', destinationController.getTrending);

// GET /api/destinations/:id
router.get('/:id', destinationController.getById);

// GET /api/destinations/:id/reviews
router.get('/:id/reviews', reviewController.getByDestination);

// --- Protected routes ---
// POST /api/destinations/:id/reviews
router.post('/:id/reviews', authMiddleware, reviewRules, reviewController.create);

// POST /api/destinations/:id/save
router.post('/:id/save', authMiddleware, userProfileController.saveDestination);

// DELETE /api/destinations/:id/save
router.delete('/:id/save', authMiddleware, userProfileController.unsaveDestination);

// POST /api/destinations/:id/visited
router.post('/:id/visited', authMiddleware, userProfileController.markVisited);

// DELETE /api/destinations/:id/visited
router.delete('/:id/visited', authMiddleware, userProfileController.unmarkVisited);

module.exports = router;
