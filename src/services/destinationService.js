// ------------------------------------------------------------
// Destination Service — Business logic for destinations
// ------------------------------------------------------------

const DestinationModel = require('../models/destinationModel');
const { searchNearbyWithPhotos } = require('./googlePlacesService');
const CategoryModel = require('../models/categoryModel');

const destinationService = {
    async list(filters) {
        return DestinationModel.findAll(filters);
    },

    async getById(id) {
        const destination = await DestinationModel.findById(id);
        if (!destination) {
            const err = new Error('Destination not found');
            err.statusCode = 404;
            throw err;
        }
        return destination;
    },

    /**
     * Increment view count for a destination.
     * @param {string} id
     * @returns {number} new view_count
     */
    async trackView(id) {
        // Verify destination exists first
        const destination = await DestinationModel.findById(id);
        if (!destination) {
            const err = new Error('Destination not found');
            err.statusCode = 404;
            throw err;
        }

        const newCount = await DestinationModel.incrementViewCount(id);
        return { view_count: newCount };
    },

    async getTrending(limit) {
        return DestinationModel.getTrending(limit);
    },

    async search(query, limit) {
        return DestinationModel.search(query, limit);
    },

    /**
     * Get nearby destinations based on user's current location.
     * 1) Query DB for existing nearby destinations (within radius)
     * 2) If fewer than limit found, fetch remaining from Google Places
     *    and auto-provision them into the DB
     *
     * @param {number} lat - User's current latitude
     * @param {number} lng - User's current longitude
     * @param {number} [radiusKm=15] - Search radius in km
     * @param {number} [limit=5] - Max nearby destinations to return
     * @returns {object[]}
     */
    async getNearby(lat, lng, radiusKm = 15, limit = 5) {
        // 1. Query DB for existing nearby destinations
        const dbNearby = await DestinationModel.findNearby(lat, lng, radiusKm, limit);

        console.log(`📍 [Nearby] Found ${dbNearby.length} existing nearby destinations`);

        // 2. If we already have enough, return them
        if (dbNearby.length >= limit) {
            return dbNearby.slice(0, limit);
        }

        // 3. Need more — fetch from Google Places API
        const remaining = limit - dbNearby.length;
        const existingNames = dbNearby.map((d) => d.name);

        console.log(`🔍 [Nearby] Fetching ${remaining} more from Google Places...`);

        const googlePlaces = await searchNearbyWithPhotos(
            lat,
            lng,
            radiusKm * 1000, // convert to meters
            remaining,
            existingNames
        );

        // 4. Auto-provision new places into the DB
        const newDestinations = [];
        for (const place of googlePlaces) {
            // Check if this place already exists (by name)
            const existing = await DestinationModel.findByName(place.name);
            if (existing) {
                const full = await DestinationModel.findById(existing.id);
                if (full) newDestinations.push(full);
                continue;
            }

            // Resolve category (default to "Attraction")
            const cat = await CategoryModel.findOrCreate('Attraction');

            const newDest = await DestinationModel.create({
                name: place.name,
                category_id: cat ? cat.id : null,
                address: place.address,
                area: place.address,
                latitude: place.latitude,
                longitude: place.longitude,
                rating_avg: place.rating,
                gmaps_url: place.gmapsUrl,
                images: place.images,
                is_active: true,
                is_trending: false,
            });

            const full = await DestinationModel.findById(newDest.id);
            newDestinations.push(full || newDest);
        }

        // 5. Combine DB results + newly created
        return [...dbNearby, ...newDestinations].slice(0, limit);
    },
};

module.exports = destinationService;
