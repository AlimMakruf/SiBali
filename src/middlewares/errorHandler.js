// ------------------------------------------------------------
// Global Error Handler Middleware
// ------------------------------------------------------------

/**
 * Catch all errors and return a consistent JSON response.
 */
function errorHandler(err, req, res, _next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An internal server error occurred';

    console.error(`[ERROR] ${statusCode} — ${message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

module.exports = errorHandler;
