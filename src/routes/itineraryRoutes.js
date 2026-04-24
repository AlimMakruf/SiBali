// ------------------------------------------------------------
// Itinerary Routes (Protected)
// ------------------------------------------------------------

const { Router } = require('express');
const itineraryController = require('../controllers/itineraryController');
const authMiddleware = require('../middlewares/authMiddleware');
const { itineraryRules } = require('../middlewares/validator');

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Itinerary CRUD
router.post('/', itineraryRules, itineraryController.create);
router.get('/', itineraryController.getAll);
router.get('/:id', itineraryController.getById);
router.put('/:id', itineraryController.update);
router.delete('/:id', itineraryController.delete);

// Days
router.post('/:id/days', itineraryController.addDay);
router.get('/:id/days', itineraryController.getDays);
router.delete('/days/:dayId', itineraryController.deleteDay);

// Items
router.post('/days/:dayId/items', itineraryController.addItem);
router.put('/items/:itemId', itineraryController.updateItem);
router.delete('/items/:itemId', itineraryController.deleteItem);

module.exports = router;
