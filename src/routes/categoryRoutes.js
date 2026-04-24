// ------------------------------------------------------------
// Category Routes (Public)
// ------------------------------------------------------------

const { Router } = require('express');
const categoryController = require('../controllers/categoryController');

const router = Router();

// GET /api/categories — list all active categories
router.get('/', categoryController.getAll);

module.exports = router;
