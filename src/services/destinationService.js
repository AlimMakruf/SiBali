// ------------------------------------------------------------
// Destination Service — Business logic for destinations
// ------------------------------------------------------------

const DestinationModel = require('../models/destinationModel');

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

    async getTrending(limit) {
        return DestinationModel.getTrending(limit);
    },

    async search(query, limit) {
        return DestinationModel.search(query, limit);
    },
};

module.exports = destinationService;
