// ------------------------------------------------------------
// One-off script: Backfill images for destinations created today
// Usage:  node scripts/backfillTodayImages.js
// ------------------------------------------------------------

require('dotenv').config();

const supabase = require('../src/config/supabase');
const { fetchPhotosForDestination } = require('../src/services/googlePlacesService');

async function run() {
    // Get today's date range (UTC+8 / WITA)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    console.log(`🔍 Fetching destinations created today (${todayStart.toISOString().split('T')[0]}) with empty images...\n`);

    // Get destinations created today with empty/missing images
    const { data: destinations, error } = await supabase
        .from('destinations')
        .select('id, name, area, images, created_at')
        .eq('is_active', true)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Failed to query destinations:', error.message);
        process.exit(1);
    }

    // Filter to only those with empty or missing images
    const needsImages = destinations.filter(
        (d) => !Array.isArray(d.images) || d.images.length === 0
    );

    console.log(`📊 Destinations created today: ${destinations.length}`);
    console.log(`📷 Missing images: ${needsImages.length}\n`);

    if (needsImages.length === 0) {
        console.log('✅ All destinations created today already have images!');
        process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const dest of needsImages) {
        process.stdout.write(`  → ${dest.name}...`);

        try {
            // Attempt 1: with area
            let photos = await fetchPhotosForDestination(dest.name, dest.area, 1);

            // Attempt 2: without area (simplified query)
            if (photos.length === 0 && dest.area) {
                process.stdout.write(' retry without area...');
                photos = await fetchPhotosForDestination(dest.name, null, 1);
            }

            // Attempt 3: append "Bali" to name as last resort
            if (photos.length === 0) {
                process.stdout.write(' retry with "Bali"...');
                photos = await fetchPhotosForDestination(`${dest.name} Bali`, null, 1);
            }

            if (photos.length > 0) {
                const { error: updateError } = await supabase
                    .from('destinations')
                    .update({ images: photos, updated_at: new Date().toISOString() })
                    .eq('id', dest.id);

                if (updateError) throw updateError;

                console.log(` ✅ (${photos[0].substring(0, 60)}...)`);
                updated++;
            } else {
                console.log(' ⚠️  No photo found after 3 attempts');
                failed++;
            }
        } catch (err) {
            console.log(` ❌ Error: ${err.message}`);
            failed++;
        }

        // Small delay to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`\n🏁 Done! Updated: ${updated}, No photo found: ${failed}`);
    process.exit(0);
}

run();
