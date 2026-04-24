// ------------------------------------------------------------
// Itinerary Service — Business logic for itineraries
// ------------------------------------------------------------

const ItineraryModel = require('../models/itineraryModel');
const ItineraryDayModel = require('../models/itineraryDayModel');
const ItineraryItemModel = require('../models/itineraryItemModel');

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

            // 4. Process Days and Destinations
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
                    // Check if destination exists
                    const existingDest = await DestinationModel.findByName(destData.destinationName);

                    if (existingDest) {
                        destinationId = existingDest.id;
                    } else {
                        // Create new destination
                        const newDestRow = {
                            name: destData.destinationName,
                            description: destData.about || '',
                            area: destData.contactInfo?.location || null,
                            gmaps_url: destData.gmapsUrl || null,
                            rating_avg: destData.rating || null,
                            is_active: true,
                            is_trending: false,
                        };
                        const createdDest = await DestinationModel.create(newDestRow);
                        destinationId = createdDest.id;
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

            // Return the full updated itinerary
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
