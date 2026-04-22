// ============================================================
//  SIBALI — Bali Tourism Recommendation System
//  Entry Point
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./src/config/config');
const errorHandler = require('./src/middlewares/errorHandler');

// ---------- Route Imports ----------
const authRoutes = require('./src/routes/authRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');

// ---------- App Initialization ----------
const app = express();

// ---------- Global Middleware ----------
app.use(helmet());                    // Security headers
app.use(cors());                      // Cross-Origin Resource Sharing
app.use(morgan('dev'));               // HTTP request logger
app.use(express.json());             // Parse JSON body
app.use(express.urlencoded({ extended: true }));

// ---------- Health Check ----------
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🌴 SIBALI API — Bali Tourism Recommendation System',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                refreshToken: 'POST /api/auth/refresh-token',
                me: 'GET  /api/auth/me',
                logout: 'POST /api/auth/logout',
            },
            recommendations: {
                trending: 'GET  /api/recommendations/trending',
                search: 'POST /api/recommendations/search',
            },
        },
    });
});

// ---------- Mount Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ---------- 404 Handler ----------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
});

// ---------- Global Error Handler ----------
app.use(errorHandler);

// ---------- Start Server ----------
// On Vercel, the platform handles connections — skip app.listen
if (!process.env.VERCEL) {
    app.listen(config.port, () => {
        console.log(`\n🚀 SIBALI API running at http://localhost:${config.port}`);
        console.log(`📌 Environment: ${config.nodeEnv}`);
        console.log(`🔑 Gemini API Key: ${config.gemini.apiKey ? 'Configured ✓' : 'NOT SET ✗'}\n`);
    });
}

module.exports = app;
