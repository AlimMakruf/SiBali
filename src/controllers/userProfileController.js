// ------------------------------------------------------------
// User Profile Controller — profile, interests, saved, visited, stats
// ------------------------------------------------------------

const userProfileService = require('../services/userProfileService');

const userProfileController = {
    /** GET /api/users/me/profile */
    async getProfile(req, res, next) {
        try {
            const data = await userProfileService.getProfile(req.user.id);
            res.status(200).json({ success: true, message: 'Profile retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** PUT /api/users/me/profile */
    async updateProfile(req, res, next) {
        try {
            const data = await userProfileService.updateProfile(req.user.id, req.body);
            res.status(200).json({ success: true, message: 'Profile updated successfully', data });
        } catch (error) { next(error); }
    },

    /** POST /api/users/me/interests */
    async setInterests(req, res, next) {
        try {
            const { categoryIds } = req.body;
            const data = await userProfileService.setInterests(req.user.id, categoryIds);
            res.status(200).json({ success: true, message: 'Interests updated successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/users/me/interests */
    async getInterests(req, res, next) {
        try {
            const data = await userProfileService.getInterests(req.user.id);
            res.status(200).json({ success: true, message: 'Interests retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/users/me/stats */
    async getStats(req, res, next) {
        try {
            const data = await userProfileService.getStats(req.user.id);
            res.status(200).json({ success: true, message: 'Stats retrieved successfully', data });
        } catch (error) { next(error); }
    },

    /** GET /api/users/me/saved */
    async getSaved(req, res, next) {
        try {
            const data = await userProfileService.getSaved(req.user.id);
            res.status(200).json({ success: true, message: 'Saved destinations retrieved', data });
        } catch (error) { next(error); }
    },

    /** GET /api/users/me/visited */
    async getVisited(req, res, next) {
        try {
            const data = await userProfileService.getVisited(req.user.id);
            res.status(200).json({ success: true, message: 'Visited destinations retrieved', data });
        } catch (error) { next(error); }
    },

    /** POST /api/destinations/:id/save */
    async saveDestination(req, res, next) {
        try {
            const data = await userProfileService.saveDestination(req.user.id, req.params.id);
            res.status(201).json({ success: true, message: 'Destination saved successfully', data });
        } catch (error) { next(error); }
    },

    /** DELETE /api/destinations/:id/save */
    async unsaveDestination(req, res, next) {
        try {
            await userProfileService.unsaveDestination(req.user.id, req.params.id);
            res.status(200).json({ success: true, message: 'Destination unsaved successfully' });
        } catch (error) { next(error); }
    },

    /** POST /api/destinations/:id/visited */
    async markVisited(req, res, next) {
        try {
            const data = await userProfileService.markVisited(req.user.id, req.params.id);
            res.status(201).json({ success: true, message: 'Destination marked as visited', data });
        } catch (error) { next(error); }
    },

    /** DELETE /api/destinations/:id/visited */
    async unmarkVisited(req, res, next) {
        try {
            await userProfileService.unmarkVisited(req.user.id, req.params.id);
            res.status(200).json({ success: true, message: 'Destination unmarked as visited' });
        } catch (error) { next(error); }
    },
};

module.exports = userProfileController;
