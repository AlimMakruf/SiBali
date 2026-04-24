// ------------------------------------------------------------
// Itinerary Controller
// ------------------------------------------------------------

const itineraryService = require('../services/itineraryService');

const itineraryController = {
    /** POST /api/itineraries */
    async create(req, res, next) {
        try {
            const data = await itineraryService.create({
                userId: req.user.id,
                ...req.body,
            });
            res.status(201).json({ success: true, message: 'Itinerary created successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/itineraries */
    async getAll(req, res, next) {
        try {
            const data = await itineraryService.getByUser(req.user.id);
            res.status(200).json({ success: true, message: 'Itineraries retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/itineraries/:id */
    async getById(req, res, next) {
        try {
            const data = await itineraryService.getById(req.params.id, req.user.id);
            res.status(200).json({ success: true, message: 'Itinerary retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** PUT /api/itineraries/:id */
    async update(req, res, next) {
        try {
            const data = await itineraryService.update(req.params.id, req.user.id, req.body);
            res.status(200).json({ success: true, message: 'Itinerary updated successfully', data });
        } catch (error) { next(error); }
    },

    /** DELETE /api/itineraries/:id */
    async delete(req, res, next) {
        try {
            await itineraryService.delete(req.params.id, req.user.id);
            res.status(200).json({ success: true, message: 'Itinerary deleted successfully' });
        } catch (error) { next(error); }
    },

    /** POST /api/itineraries/:id/days */
    async addDay(req, res, next) {
        try {
            const { dayNumber, date } = req.body;
            const data = await itineraryService.addDay(req.params.id, dayNumber, date);
            res.status(201).json({ success: true, message: 'Day added successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/itineraries/:id/days */
    async getDays(req, res, next) {
        try {
            const data = await itineraryService.getDays(req.params.id);
            res.status(200).json({ success: true, message: 'Days retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** DELETE /api/itineraries/days/:dayId */
    async deleteDay(req, res, next) {
        try {
            await itineraryService.deleteDay(req.params.dayId);
            res.status(200).json({ success: true, message: 'Day deleted successfully' });
        } catch (error) { next(error); }
    },

    /** POST /api/itineraries/days/:dayId/items */
    async addItem(req, res, next) {
        try {
            const data = await itineraryService.addItem({
                itineraryDayId: req.params.dayId,
                ...req.body,
            });
            res.status(201).json({ success: true, message: 'Item added successfully', data });
        } catch (error) { next(error); }
    },

    /** PUT /api/itineraries/items/:itemId */
    async updateItem(req, res, next) {
        try {
            const data = await itineraryService.updateItem(req.params.itemId, req.body);
            res.status(200).json({ success: true, message: 'Item updated successfully', data });
        } catch (error) { next(error); }
    },

    /** DELETE /api/itineraries/items/:itemId */
    async deleteItem(req, res, next) {
        try {
            await itineraryService.deleteItem(req.params.itemId);
            res.status(200).json({ success: true, message: 'Item deleted successfully' });
        } catch (error) { next(error); }
    },
};

module.exports = itineraryController;
