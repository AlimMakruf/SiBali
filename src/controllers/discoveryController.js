const itineraryService = require('../services/itineraryService');

const discoveryController = {
    /**
     * Generate an itinerary based on user discovery inputs
     */
    async generate(req, res, next) {
        try {
            const userId = req.user.id;
            const {
                durationDays,
                durationNights,
                interests,
                budgetRange,
                adults,
                children,
                specialRequests,
                area,
                customPreferences
            } = req.body;

            const inputs = {
                durationDays,
                durationNights,
                interests,
                budgetRange,
                adults,
                children,
                specialRequests,
                area,
                customPreferences
            };

            const itinerary = await itineraryService.generateDiscoveryItinerary(userId, inputs);

            res.status(201).json({
                status: 'success',
                message: 'Itinerary generated successfully',
                data: itinerary
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = discoveryController;
