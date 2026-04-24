// ------------------------------------------------------------
// Destination Controller
// ------------------------------------------------------------

const destinationService = require('../services/destinationService');

const destinationController = {
    /**
     * GET /api/destinations
     * Query params: categoryId, search, limit, offset
     */
    async getAll(req, res, next) {
        try {
            const { categoryId, search, limit, offset } = req.query;
            const data = await destinationService.list({
                categoryId,
                search,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
            });

            res.status(200).json({
                success: true,
                message: 'Destinations retrieved successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/destinations/trending
     */
    async getTrending(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const data = await destinationService.getTrending(limit);

            res.status(200).json({
                success: true,
                message: 'Trending destinations retrieved successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/destinations/:id
     */
    async getById(req, res, next) {
        try {
            const data = await destinationService.getById(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Destination retrieved successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = destinationController;
