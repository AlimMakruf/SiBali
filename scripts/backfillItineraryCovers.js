// ------------------------------------------------------------
// One-off script: Backfill cover_image for existing itineraries
// Usage:  node scripts/backfillItineraryCovers.js
// ------------------------------------------------------------

require('dotenv').config();

const supabase = require('../src/config/supabase');
const ItineraryModel = require('../src/models/itineraryModel');

async function run() {
    console.log('🔍 Fetching itineraries without cover images...\n');

    // Get all itineraries where cover_image is null
    const { data: itineraries, error } = await supabase
        .from('itineraries')
        .select('id, user_id')
        .is('cover_image', null);

    if (error) {
        console.error('❌ Failed to query itineraries:', error.message);
        process.exit(1);
    }

    console.log(`📊 Found ${itineraries.length} itineraries missing cover images.\n`);

    if (itineraries.length === 0) {
        console.log('✅ All itineraries already have cover images!');
        process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const itin of itineraries) {
        process.stdout.write(`  → Itinerary ${itin.id}...`);

        try {
            // Get full itinerary details including days and destinations
            const fullItinerary = await ItineraryModel.findById(itin.id);
            if (!fullItinerary) {
                console.log(' ⚠️  Not found or error fetching details');
                failed++;
                continue;
            }

            let coverImageToSet = null;

            for (const day of fullItinerary.itinerary_days || []) {
                for (const item of day.itinerary_items || []) {
                    const dest = item.destinations;
                    if (dest && Array.isArray(dest.images) && dest.images.length > 0) {
                        coverImageToSet = dest.images[0];
                        break;
                    }
                }
                if (coverImageToSet) break;
            }

            if (coverImageToSet) {
                const { error: updateError } = await supabase
                    .from('itineraries')
                    .update({ cover_image: coverImageToSet, updated_at: new Date().toISOString() })
                    .eq('id', itin.id);

                if (updateError) throw updateError;

                console.log(` ✅ Updated`);
                updated++;
            } else {
                console.log(' ⚠️  No images found in any destinations');
                failed++;
            }
        } catch (err) {
            console.log(` ❌ Error: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n🏁 Done! Updated: ${updated}, No images available: ${failed}`);
    process.exit(0);
}

run();
