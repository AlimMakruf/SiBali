// ------------------------------------------------------------
// Recommendation Controller — Handle trending & search
// ------------------------------------------------------------

const geminiService = require('../services/geminiService');

const recommendationController = {
    /**
     * GET /api/recommendations/trending
     */
    async getTrending(req, res, next) {
        try {
            const result = await geminiService.getTrendingPlaces();

            res.status(200).json({
                success: true,
                message: 'Trending places retrieved successfully',
                source: result.source, // 'database' or 'gemini'
                data: result.data,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/recommendations/search
     */
    async search(req, res, next) {
        try {
            const { keyword, category, budget } = req.body;
            const userId = req.user.id; // From authMiddleware

            const result = await geminiService.searchRecommendations({
                keyword,
                category,
                budget,
                userId,
            });

            res.status(200).json({
                success: true,
                message: `Recommendations for "${keyword}" retrieved successfully`,
                source: result.source, // 'cache' or 'gemini'
                data: result.data,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = recommendationController;
