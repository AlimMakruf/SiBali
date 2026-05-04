// ------------------------------------------------------------
// One-off script: Backfill images for trending destinations
// Usage:  node scripts/backfillTrendingImages.js
// ------------------------------------------------------------

require('dotenv').config();

const supabase = require('../src/config/supabase');
const { fetchPhotosForDestination } = require('../src/services/googlePlacesService');

async function run() {
    console.log('🔍 Fetching all destinations with empty images...\n');

    // Get all active destinations
    const { data: destinations, error } = await supabase
        .from('destinations')
        .select('id, name, area, images')
        .eq('is_active', true);

    if (error) {
        console.error('❌ Failed to query destinations:', error.message);
        process.exit(1);
    }

    // Filter to only those with empty or missing images
    const needsImages = destinations.filter(
        (d) => !Array.isArray(d.images) || d.images.length === 0
    );

    console.log(`📊 Total destinations: ${destinations.length}`);
    console.log(`📷 Missing images: ${needsImages.length}\n`);

    if (needsImages.length === 0) {
        console.log('✅ All trending destinations already have images!');
        process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const dest of needsImages) {
        process.stdout.write(`  → ${dest.name}...`);

        try {
            const photos = await fetchPhotosForDestination(dest.name, dest.area, 1);

            if (photos.length > 0) {
                const { error: updateError } = await supabase
                    .from('destinations')
                    .update({ images: photos, updated_at: new Date().toISOString() })
                    .eq('id', dest.id);

                if (updateError) throw updateError;

                console.log(` ✅ (${photos[0].substring(0, 60)}...)`);
                updated++;
            } else {
                console.log(' ⚠️  No photo found on Google Places');
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
