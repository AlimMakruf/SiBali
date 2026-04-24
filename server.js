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
        message: '🌴 SIBALI API — Bali Tourism Recommendation System',
        version: '2.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                refreshToken: 'POST /api/auth/refresh-token',
                me: 'GET  /api/auth/me',
                logout: 'POST /api/auth/logout',
            },
            categories: {
                list: 'GET  /api/categories',
            },
            destinations: {
                list: 'GET  /api/destinations',
                trending: 'GET  /api/destinations/trending',
                detail: 'GET  /api/destinations/:id',
                reviews: 'GET  /api/destinations/:id/reviews',
                addReview: 'POST /api/destinations/:id/reviews',
                save: 'POST /api/destinations/:id/save',
                unsave: 'DELETE /api/destinations/:id/save',
                markVisited: 'POST /api/destinations/:id/visited',
                unmarkVisited: 'DELETE /api/destinations/:id/visited',
            },
            users: {
                profile: 'GET  /api/users/me/profile',
                updateProfile: 'PUT  /api/users/me/profile',
                setInterests: 'POST /api/users/me/interests',
                getInterests: 'GET  /api/users/me/interests',
                stats: 'GET  /api/users/me/stats',
                saved: 'GET  /api/users/me/saved',
                visited: 'GET  /api/users/me/visited',
                reviews: 'GET  /api/users/me/reviews',
                deleteReview: 'DELETE /api/users/reviews/:id',
            },
            itineraries: {
                create: 'POST /api/itineraries',
                list: 'GET  /api/itineraries',
                detail: 'GET  /api/itineraries/:id',
                update: 'PUT  /api/itineraries/:id',
                delete: 'DELETE /api/itineraries/:id',
                addDay: 'POST /api/itineraries/:id/days',
                getDays: 'GET  /api/itineraries/:id/days',
                deleteDay: 'DELETE /api/itineraries/days/:dayId',
                addItem: 'POST /api/itineraries/days/:dayId/items',
                updateItem: 'PUT  /api/itineraries/items/:itemId',
                deleteItem: 'DELETE /api/itineraries/items/:itemId',
            },
            discovery: {
                generateItinerary: 'POST /api/discovery/generate-itinerary',
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
app.use('/api/categories', categoryRoutes);
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
    app.listen(config.port, () => {
        console.log(`\n🚀 SIBALI API running at http://localhost:${config.port}`);
        console.log(`📌 Environment: ${config.nodeEnv}`);
        console.log(`🔑 Gemini API Key: ${config.gemini.apiKey ? 'Configured ✓' : 'NOT SET ✗'}\n`);
    });
}

module.exports = app;
