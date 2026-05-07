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

    /**
     * GET /api/destinations/nearby?lat=...&lng=...
     * Query params: lat (required), lng (required), radius (km, default 15), limit (default 5)
     */
    async getNearby(req, res, next) {
        try {
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'lat and lng query parameters are required',
                });
            }

            const radius = req.query.radius ? parseFloat(req.query.radius) : 15;
            const limit = req.query.limit ? parseInt(req.query.limit) : 5;

            const data = await destinationService.getNearby(
                parseFloat(lat),
                parseFloat(lng),
                radius,
                limit
            );

            res.status(200).json({
                success: true,
                message: `Found ${data.length} nearby destination(s)`,
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/destinations/:id/view
     * Track a page view for a destination (public, no auth required).
     */
    async trackView(req, res, next) {
        try {
            const data = await destinationService.trackView(req.params.id);

            res.status(200).json({
                success: true,
                message: 'View tracked successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = destinationController;
