// ------------------------------------------------------------
// Trending Destination Scheduler
// Runs every 2 days to refresh trending destinations from Gemini AI
// ------------------------------------------------------------

const cron = require('node-cron');

const SCHEDULE_INTERVAL = '0 0 */2 * *'; // Every 2 days at midnight

/**
 * Refresh trending destinations by calling Gemini AI.
 * This is extracted so it can be called by both the scheduler and manually.
 */
async function refreshTrendingDestinations() {
    // Lazy-require to avoid circular dependencies
    const geminiService = require('../services/geminiService');

    console.log('📡 [Scheduler] Refreshing trending destinations from Gemini AI...');
    const startTime = Date.now();

    try {
        const result = await geminiService.refreshTrending();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
            `✅ [Scheduler] Trending destinations refreshed successfully in ${elapsed}s ` +
            `(${result.count} destinations, source: ${result.source})`
        );
        return result;
    } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`❌ [Scheduler] Failed to refresh trending destinations after ${elapsed}s:`, error.message);
        throw error;
    }
}

/**
 * Start the trending destinations cron job.
 * Runs every 2 days at midnight (00:00).
 */
function startTrendingScheduler() {
    console.log('🕐 [Scheduler] Trending destination scheduler started (every 2 days)');

    const task = cron.schedule(SCHEDULE_INTERVAL, async () => {
        console.log(`\n⏰ [Scheduler] Cron triggered at ${new Date().toISOString()}`);
        try {
            await refreshTrendingDestinations();
        } catch {
            // Error already logged in refreshTrendingDestinations
        }
    }, {
        timezone: 'Asia/Makassar', // WITA (Bali timezone, UTC+8)
    });

    return task;
}

module.exports = {
    startTrendingScheduler,
    refreshTrendingDestinations,
};
