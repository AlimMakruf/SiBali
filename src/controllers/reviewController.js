// ------------------------------------------------------------
// Review Controller
// ------------------------------------------------------------

const reviewService = require('../services/reviewService');

const reviewController = {
    /**
     * POST /api/destinations/:id/reviews
     */
    async create(req, res, next) {
        try {
            const { rating, comment } = req.body;
            const data = await reviewService.createOrUpdate({
                userId: req.user.id,
                destinationId: req.params.id,
                rating,
                comment,
            });

            res.status(201).json({
                success: true,
                message: 'Review submitted successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/destinations/:id/reviews
     */
    async getByDestination(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            const data = await reviewService.getByDestination(req.params.id, limit, offset);

            res.status(200).json({
                success: true,
                message: 'Reviews retrieved successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/reviews/:id
     */
    async delete(req, res, next) {
        try {
            await reviewService.delete(req.params.id, req.user.id);

            res.status(200).json({
                success: true,
                message: 'Review deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = reviewController;
