// ------------------------------------------------------------
// Itinerary Service — Business logic for itineraries
// ------------------------------------------------------------

const ItineraryModel = require('../models/itineraryModel');
const ItineraryDayModel = require('../models/itineraryDayModel');
const ItineraryItemModel = require('../models/itineraryItemModel');
const CategoryModel = require('../models/categoryModel');
const { fetchPhotosForDestination } = require('./googlePlacesService');

const itineraryService = {
    async create(data) {
        return ItineraryModel.create(data);
    },

    /**
     * Generate an AI itinerary from discovery inputs.
     * @param {string} userId
     * @param {object} inputs
     */
    async generateDiscoveryItinerary(userId, inputs) {
        const geminiService = require('./geminiService');
        const DestinationModel = require('../models/destinationModel');

        // 1. Create a draft itinerary with 'generating' status
        const draftData = {
            userId,
            title: 'Generating your itinerary...',
            durationDays: inputs.durationDays,
            durationNights: inputs.durationNights || 0,
            budgetRange: inputs.budgetRange,
            area: inputs.area,
            companionType: inputs.adults > 1 ? 'Group' : 'Solo',
            customPreferences: inputs.customPreferences,
            discoveryInputs: inputs,
            aiStatus: 'generating',
            isAiGenerated: true,
        };
        const draftItinerary = await ItineraryModel.create(draftData);

        try {
            // 2. Call Gemini
            const aiResult = await geminiService.generateItineraryFromDiscovery(inputs);

            if (!aiResult || !aiResult.days) {
                throw new Error('Invalid response from AI');
            }

            // 3. Update the itinerary title and details
            let totalDestinations = 0;
            await ItineraryModel.update(draftItinerary.id, userId, {
                title: aiResult.title || 'Your Custom Bali Itinerary',
                ai_status: 'done',
            });

            // -------------------------------------------------------
            // Phase A: Create days + destinations (collect photo queue)
            // -------------------------------------------------------
            const photoFetchQueue = []; // { destinationId, name, area }

            for (const day of aiResult.days) {
                // Create Day
                const itineraryDay = await ItineraryDayModel.create(
                    draftItinerary.id,
                    day.dayNumber
                );

                let orderInDay = 1;
                for (const item of day.items || []) {
                    const destData = item.destination;
                    if (!destData || !destData.destinationName) continue;

                    let destinationId;
                    const existingDest = await DestinationModel.findByName(destData.destinationName);

                    if (existingDest) {
                        destinationId = existingDest.id;

                        // Queue backfill if existing destination has no images
                        const hasImages = Array.isArray(existingDest.images) && existingDest.images.length > 0;
                        if (!hasImages) {
                            photoFetchQueue.push({
                                destinationId: existingDest.id,
                                name: destData.destinationName,
                                area: existingDest.area || destData.contactInfo?.location,
                            });
                        }
                    } else {
                        // Resolve category
                        let categoryId = null;
                        if (destData.category) {
                            const cat = await CategoryModel.findOrCreate(destData.category);
                            categoryId = cat ? cat.id : null;
                        }

                        // Create destination WITHOUT images first
                        const newDestRow = {
                            name: destData.destinationName,
                            category_id: categoryId,
                            description: destData.about || '',
                            ai_description: destData.aiInsight || null,
                            about: destData.about || null,
                            address: destData.contactInfo?.location || null,
                            area: destData.contactInfo?.location || null,
                            latitude: destData.coordinates?.latitude || null,
                            longitude: destData.coordinates?.longitude || null,
                            gmaps_url: destData.gmapsUrl || null,
                            phone: destData.contactInfo?.phone || null,
                            website: destData.contactInfo?.website || null,
                            amenities: Array.isArray(destData.amenities) ? destData.amenities : [],
                            images: [],
                            rating_avg: destData.rating || null,
                            is_active: true,
                            is_trending: false,
                        };
                        const createdDest = await DestinationModel.create(newDestRow);
                        destinationId = createdDest.id;

                        photoFetchQueue.push({
                            destinationId: createdDest.id,
                            name: destData.destinationName,
                            area: destData.contactInfo?.location,
                        });
                    }

                    // Create Itinerary Item
                    await ItineraryItemModel.create({
                        itineraryDayId: itineraryDay.id,
                        destinationId,
                        visitTime: item.visitTime,
                        orderInDay,
                        notes: item.notes,
                    });

                    orderInDay++;
                    totalDestinations++;
                }
            }

            // Update final total destinations
            await ItineraryModel.update(draftItinerary.id, userId, {
                total_destinations: totalDestinations,
            });

            // Return itinerary immediately — photos are fetched via
            // a separate POST /api/itineraries/:id/backfill-images call
            // from the frontend (Vercel Hobby 10s limit can't fit photos here)
            return await this.getById(draftItinerary.id, userId);

        } catch (error) {
            // Mark as failed if anything goes wrong
            await ItineraryModel.update(draftItinerary.id, userId, {
                ai_status: 'failed',
                title: 'Itinerary Generation Failed',
            });
            throw error;
        }
    },
    /**
     * Backfill missing images for all destinations in a specific itinerary.
     * This is intended to be called explicitly by the frontend after generating an itinerary.
     * 
     * @param {string} itineraryId 
     * @param {string} userId 
     * @returns {object} Status of the backfill operation
     */
    async backfillItineraryImages(itineraryId, userId) {
        const DestinationModel = require('../models/destinationModel');
        
        // 1. Get the itinerary to verify ownership and get destinations
        const itinerary = await this.getById(itineraryId, userId);
        
        // 2. Extract all unique destinations that need images
        const destinationsToBackfill = new Map(); // Use Map to deduplicate by ID
        
        for (const day of itinerary.itinerary_days || []) {
            for (const item of day.itinerary_items || []) {
                const dest = item.destinations;
                if (dest) {
                    const hasImages = Array.isArray(dest.images) && dest.images.length > 0;
                    if (!hasImages) {
                        destinationsToBackfill.set(dest.id, {
                            id: dest.id,
                            name: dest.name,
                            area: dest.area
                        });
                    }
                }
            }
        }
        
        const queue = Array.from(destinationsToBackfill.values());
        
        if (queue.length === 0) {
            return { message: 'All destinations already have images', updated: 0, failed: 0 };
        }
        
        console.log(`📷 [Backfill API] Fetching photos for ${queue.length} destination(s) in itinerary ${itineraryId}...`);
        
        // 3. Fetch photos in parallel
        const results = await Promise.allSettled(
            queue.map(async (entry) => {
                // Attempt 1: with area
                let photos = await fetchPhotosForDestination(entry.name, entry.area, 1);
                
                // Attempt 2: without area
                if (photos.length === 0) {
                    photos = await fetchPhotosForDestination(entry.name, null, 1);
                }
                
                return { ...entry, photos };
            })
        );
        
        // 4. Update the destinations in database
        let updated = 0;
        let failed = 0;
        let coverImageToSet = null;
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.photos.length > 0) {
                await DestinationModel.update(result.value.id, {
                    images: result.value.photos,
                });
                if (!coverImageToSet) {
                    coverImageToSet = result.value.photos[0];
                }
                updated++;
            } else {
                failed++;
            }
        }
        
        // 5. Update itinerary cover image if not set
        if (!itinerary.cover_image) {
            if (!coverImageToSet) {
                for (const day of itinerary.itinerary_days || []) {
                    for (const item of day.itinerary_items || []) {
                        const dest = item.destinations;
                        if (dest && Array.isArray(dest.images) && dest.images.length > 0) {
                            coverImageToSet = dest.images[0];
                            break;
                        }
                    }
                    if (coverImageToSet) break;
                }
            }
            
            if (coverImageToSet) {
                await ItineraryModel.update(itineraryId, userId, { cover_image: coverImageToSet });
            }
        }
        
        console.log(`📷 [Backfill API] Complete for itinerary ${itineraryId}: ${updated} success, ${failed} failed`);
        return { message: 'Backfill completed', updated, failed };
    },

    async getByUser(userId) {
        return ItineraryModel.findByUserId(userId);
    },

    async getById(id, userId) {
        const itinerary = await ItineraryModel.findById(id);
        if (!itinerary) {
            const err = new Error('Itinerary not found');
            err.statusCode = 404;
            throw err;
        }
        // Ownership check
        if (itinerary.user_id !== userId) {
            const err = new Error('Not authorized to view this itinerary');
            err.statusCode = 403;
            throw err;
        }
        return itinerary;
    },

    async update(id, userId, fields) {
        const result = await ItineraryModel.update(id, userId, fields);
        if (!result) {
            const err = new Error('Itinerary not found or not authorized');
            err.statusCode = 404;
            throw err;
        }
        return result;
    },

    async delete(id, userId) {
        const result = await ItineraryModel.delete(id, userId);
        if (!result) {
            const err = new Error('Itinerary not found or not authorized');
            err.statusCode = 404;
            throw err;
        }
        return result;
    },

    // Day operations
    async addDay(itineraryId, dayNumber, date) {
        return ItineraryDayModel.create(itineraryId, dayNumber, date);
    },

    async getDays(itineraryId) {
        return ItineraryDayModel.getByItineraryId(itineraryId);
    },

    async deleteDay(dayId) {
        return ItineraryDayModel.delete(dayId);
    },

    // Item operations
    async addItem(data) {
        return ItineraryItemModel.create(data);
    },

    async getItems(dayId) {
        return ItineraryItemModel.getByDayId(dayId);
    },

    async updateItem(itemId, fields) {
        return ItineraryItemModel.update(itemId, fields);
    },

    async deleteItem(itemId) {
        return ItineraryItemModel.delete(itemId);
    },
};

module.exports = itineraryService;
