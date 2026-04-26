// ------------------------------------------------------------
// Interest Routes (Public)
// ------------------------------------------------------------

const { Router } = require('express');
const interestController = require('../controllers/interestController');

const router = Router();

// GET /api/interests — list all active interests
router.get('/', interestController.getAll);

module.exports = router;
