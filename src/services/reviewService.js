// ------------------------------------------------------------
// Review Service — Business logic for reviews
// ------------------------------------------------------------

const ReviewModel = require('../models/reviewModel');

const reviewService = {
    async createOrUpdate({ userId, destinationId, rating, comment }) {
        return ReviewModel.upsert({ userId, destinationId, rating, comment });
    },

    async getByDestination(destinationId, limit, offset) {
        return ReviewModel.getByDestinationId(destinationId, limit, offset);
    },

    async getByUser(userId) {
        return ReviewModel.getByUserId(userId);
    },

    async delete(id, userId) {
        const deleted = await ReviewModel.delete(id, userId);
        if (!deleted) {
            const err = new Error('Review not found or you are not the owner');
            err.statusCode = 404;
            throw err;
        }
        return deleted;
    },
};

module.exports = reviewService;
