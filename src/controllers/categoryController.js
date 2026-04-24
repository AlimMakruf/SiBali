// ------------------------------------------------------------
// Category Controller
// ------------------------------------------------------------

const CategoryModel = require('../models/categoryModel');

const categoryController = {
    /**
     * GET /api/categories
     */
    async getAll(req, res, next) {
        try {
            const categories = await CategoryModel.getAll();

            res.status(200).json({
                success: true,
                message: 'Categories retrieved successfully',
                data: categories,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = categoryController;
