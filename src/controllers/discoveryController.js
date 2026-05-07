const itineraryService = require('../services/itineraryService');

const discoveryController = {
    /**
     * Generate an itinerary based on user discovery inputs.
     *
     * Flow:
     * 1. Generate itinerary (Gemini AI + create destinations in DB)
     * 2. Send response to client immediately (no photos yet)
     * 3. Backfill photos in background after response is sent
     *
     * This ensures the API doesn't timeout on Vercel serverless
     * while waiting for 15+ Google Places API calls.
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

            const { itinerary, photoFetchQueue } = await itineraryService.generateDiscoveryItinerary(userId, inputs);

            // Send the response FIRST — user gets their itinerary immediately
            res.status(201).json({
                status: 'success',
                message: 'Itinerary generated successfully',
                data: itinerary
            });

            // AFTER response is sent, backfill photos in background.
            // On traditional servers (npm run dev), this continues running.
            // On Vercel, we use res.on('finish') to maximize execution time.
            if (photoFetchQueue && photoFetchQueue.length > 0) {
                itineraryService.backfillPhotos(photoFetchQueue).catch((err) => {
                    console.error('❌ [Discovery] Background photo backfill error:', err.message);
                });
            }
        } catch (error) {
            next(error);
        }
    }
};

module.exports = discoveryController;
