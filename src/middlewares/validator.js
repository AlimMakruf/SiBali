// ------------------------------------------------------------
// Input Validation Middleware (express-validator)
// ------------------------------------------------------------

const { body, validationResult } = require('express-validator');

/**
 * Helper — run validation and return errors if any.
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((e) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    next();
}

// ============ Validation Rules ============

const registerRules = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2-100 characters'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    handleValidationErrors,
];

const loginRules = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors,
];

const searchRules = [
    body('keyword')
        .trim()
        .notEmpty()
        .withMessage('Search keyword is required')
        .isLength({ min: 2, max: 200 })
        .withMessage('Keyword must be between 2-200 characters'),
    body('category')
        .optional()
        .trim()
        .isIn(['Pantai', 'Pura', 'Alam', 'Budaya', 'Kuliner', 'Adventure'])
        .withMessage('Invalid category'),
    body('budget')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Budget must not be empty if provided'),
    handleValidationErrors,
];

const refreshTokenRules = [
    body('refreshToken')
        .trim()
        .notEmpty()
        .withMessage('Refresh token is required'),
    handleValidationErrors,
];

module.exports = {
    registerRules,
    loginRules,
    searchRules,
    refreshTokenRules,
};
