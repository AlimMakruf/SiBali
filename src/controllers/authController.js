// ------------------------------------------------------------
// Auth Controller — Handle register, login, refresh, me, logout
// ------------------------------------------------------------

const authService = require('../services/authService');

const authController = {
    /**
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const { name, email, password, date_of_birth, nationality } = req.body;
            const result = await authService.register(name, email, password, { date_of_birth, nationality });

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/refresh-token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/auth/me
     */
    async me(req, res, next) {
        try {
            const result = await authService.checkUser(req.user.id);

            res.status(200).json({
                success: true,
                message: 'User is authenticated',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/logout
     */
    async logout(req, res, next) {
        try {
            const { jti, exp } = req.tokenPayload;
            const { refreshToken } = req.body;

            await authService.logout(jti, exp, refreshToken, req.user.id);

            res.status(200).json({
                success: true,
                message: 'Logout successful',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;
