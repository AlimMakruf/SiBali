// ------------------------------------------------------------
// User Profile Service — Profile, interests, stats
// ------------------------------------------------------------

const UserModel = require('../models/userModel');
const UserInterestModel = require('../models/userInterestModel');
const SavedDestinationModel = require('../models/savedDestinationModel');
const VisitedDestinationModel = require('../models/visitedDestinationModel');

const userProfileService = {
    async getProfile(userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        return user;
    },

    async updateProfile(userId, fields) {
        return UserModel.updateProfile(userId, fields);
    },

    async setInterests(userId, categoryIds) {
        if (!categoryIds || categoryIds.length < 3) {
            const err = new Error('Please select at least 3 interests');
            err.statusCode = 400;
            throw err;
        }
        return UserInterestModel.setInterests(userId, categoryIds);
    },

    async getInterests(userId) {
        return UserInterestModel.getByUserId(userId);
    },

    async getStats(userId) {
        const [savedCount, visitedCount] = await Promise.all([
            SavedDestinationModel.countByUserId(userId),
            VisitedDestinationModel.countByUserId(userId),
        ]);
        return { saved: savedCount, visited: visitedCount };
    },

    // Saved destinations
    async getSaved(userId) {
        return SavedDestinationModel.getByUserId(userId);
    },

    async saveDestination(userId, destinationId) {
        return SavedDestinationModel.save(userId, destinationId);
    },

    async unsaveDestination(userId, destinationId) {
        const result = await SavedDestinationModel.unsave(userId, destinationId);
        if (!result) {
            const err = new Error('Destination was not saved');
            err.statusCode = 404;
            throw err;
        }
        return result;
    },

    // Visited destinations
    async getVisited(userId) {
        return VisitedDestinationModel.getByUserId(userId);
    },

    async markVisited(userId, destinationId) {
        return VisitedDestinationModel.markVisited(userId, destinationId);
    },

    async unmarkVisited(userId, destinationId) {
        const result = await VisitedDestinationModel.unmarkVisited(userId, destinationId);
        if (!result) {
            const err = new Error('Destination was not marked as visited');
            err.statusCode = 404;
            throw err;
        }
        return result;
    },
};

module.exports = userProfileService;
