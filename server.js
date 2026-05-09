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
const categoryRoutes = require('./src/routes/categoryRoutes');
const interestRoutes = require('./src/routes/interestRoutes');
const destinationRoutes = require('./src/routes/destinationRoutes');
const userRoutes = require('./src/routes/userRoutes');
const itineraryRoutes = require('./src/routes/itineraryRoutes');

const discoveryRoutes = require('./src/routes/discoveryRoutes');

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
        message: '🌴 SIBALI API — Bali Tourism Recommendation System is running.',
        version: '2.0.0'
    });
});

// ---------- Mount Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/discovery', discoveryRoutes);
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
    const { startTrendingScheduler } = require('./src/scheduler/trendingScheduler');

    app.listen(config.port, () => {
        console.log(`\n🚀 SIBALI API running at http://localhost:${config.port}`);
        console.log(`📌 Environment: ${config.nodeEnv}`);
        console.log(`🔑 Gemini API Key: ${config.gemini.apiKey ? 'Configured ✓' : 'NOT SET ✗'}`);

        // Start the trending destination scheduler (every 2 days)
        startTrendingScheduler();
        console.log('');
    });
}

module.exports = app;
