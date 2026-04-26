// ------------------------------------------------------------
// Interest Controller
// ------------------------------------------------------------

const InterestModel = require('../models/interestModel');

const interestController = {
    /**
     * GET /api/interests
     */
    async getAll(req, res, next) {
        try {
            const interests = await InterestModel.getAll();

            res.status(200).json({
                success: true,
                message: 'Interests retrieved successfully',
                data: interests,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = interestController;
