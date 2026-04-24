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
    body('date_of_birth')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format (use YYYY-MM-DD)'),
    body('nationality')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Nationality must be at most 100 characters'),
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
        .trim(),
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

const reviewRules = [
    body('rating')
        .notEmpty()
        .withMessage('Rating is required')
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Comment must be at most 2000 characters'),
    handleValidationErrors,
];

const interestRules = [
    body('categoryIds')
        .isArray({ min: 3 })
        .withMessage('Please select at least 3 interests'),
    body('categoryIds.*')
        .isUUID()
        .withMessage('Each interest must be a valid category ID'),
    handleValidationErrors,
];

const itineraryRules = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 2, max: 255 })
        .withMessage('Title must be between 2-255 characters'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('durationDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Duration days must be at least 1'),
    body('durationNights')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration nights must be 0 or more'),
    body('budget')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Budget must be a positive number'),
    handleValidationErrors,
];

const profileUpdateRules = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2-100 characters'),
    body('date_of_birth')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format (use YYYY-MM-DD)'),
    body('nationality')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Nationality must be at most 100 characters'),
    handleValidationErrors,
];

const discoveryRules = [
    body('durationDays')
        .isInt({ min: 1, max: 14 })
        .withMessage('Duration days must be between 1 and 14'),
    body('durationNights')
        .optional()
        .isInt({ min: 0 }),
    body('interests')
        .isArray({ min: 1 })
        .withMessage('At least one interest must be provided'),
    body('budgetRange')
        .isIn(['Budget', 'Moderate', 'Luxury'])
        .withMessage('Budget must be Budget, Moderate, or Luxury'),
    body('adults')
        .isInt({ min: 1 })
        .withMessage('At least 1 adult is required'),
    body('children')
        .optional()
        .isInt({ min: 0 }),
    body('area')
        .optional()
        .trim(),
    body('specialRequests')
        .optional()
        .trim(),
    body('customPreferences')
        .optional()
        .trim(),
    handleValidationErrors,
];

module.exports = {
    registerRules,
    loginRules,
    searchRules,
    refreshTokenRules,
    reviewRules,
    interestRules,
    itineraryRules,
    profileUpdateRules,
    discoveryRules,
};
