// ------------------------------------------------------------
// Google Places Service — Fetches real photos from Places API (New)
// Uses Text Search to find a place, then retrieves photo URLs
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-photos
// ------------------------------------------------------------

const config = require('../config/config');

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

/**
 * Search for a place using Google Places Text Search (New).
 * Returns the first matching place's photos[] array.
 *
 * @param {string} name - Destination name (e.g. "Tanah Lot")
 * @param {string} [area] - Optional area bias (e.g. "Tabanan, Bali")
 * @returns {object[]} - Array of photo objects with { name, widthPx, heightPx }
 */
async function searchPlace(name, area) {
    const apiKey = config.googlePlaces?.apiKey;
    if (!apiKey) return [];

    const textQuery = area
        ? `${name}, ${area}, Bali`
        : `${name}, Bali`;

    try {
        const response = await fetch(`${PLACES_BASE_URL}/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.photos',
            },
            body: JSON.stringify({
                textQuery,
                pageSize: 1,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`⚠️ [Places] Text Search failed (${response.status}):`, errText);
            return [];
        }

        const data = await response.json();
        const place = data.places?.[0];
        return place?.photos || [];
    } catch (error) {
        console.error('⚠️ [Places] Text Search error:', error.message);
        return [];
    }
}

/**
 * Get a stable CDN photo URL from a Places photo resource name.
 * Uses skipHttpRedirect=true to get a JSON response with photoUri.
 *
 * @param {string} photoName - Photo resource name (e.g. "places/ChIJ.../photos/ATK...")
 * @param {number} [maxWidthPx=800] - Maximum width in pixels
 * @returns {string|null} - CDN photo URL or null on failure
 */
async function getPhotoUrl(photoName, maxWidthPx = 800) {
    const apiKey = config.googlePlaces?.apiKey;
    if (!apiKey || !photoName) return null;

    try {
        const url = `${PLACES_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`⚠️ [Places] Photo media failed (${response.status}) for ${photoName}`);
            return null;
        }

        const data = await response.json();
        return data.photoUri || null;
    } catch (error) {
        console.error('⚠️ [Places] Photo media error:', error.message);
        return null;
    }
}

/**
 * Fetch photo URLs for a destination by name.
 * Orchestrates: Text Search → get photo resource names → resolve CDN URLs.
 *
 * @param {string} destinationName - Name of the destination
 * @param {string} [area] - Optional area/location bias
 * @param {number} [maxPhotos=1] - Max number of photos to return
 * @returns {string[]} - Array of photo CDN URLs (may be empty)
 */
async function fetchPhotosForDestination(destinationName, area, maxPhotos = 1) {
    const apiKey = config.googlePlaces?.apiKey;
    if (!apiKey) {
        return []; // Graceful fallback when API key is not configured
    }

    // 1. Search for the place
    const photos = await searchPlace(destinationName, area);
    if (!photos.length) {
        console.log(`📷 [Places] No photos found for "${destinationName}"`);
        return [];
    }

    // 2. Take up to maxPhotos and resolve each to a CDN URL
    const selectedPhotos = photos.slice(0, maxPhotos);
    const urls = await Promise.all(
        selectedPhotos.map((photo) => getPhotoUrl(photo.name))
    );

    // Filter out nulls
    const validUrls = urls.filter(Boolean);
    if (validUrls.length > 0) {
        console.log(`📷 [Places] Fetched ${validUrls.length} photo(s) for "${destinationName}"`);
    }

    return validUrls;
}

/**
 * Search for nearby places using Google Places Nearby Search (New).
 * Returns up to `maxResults` tourist places within a given radius.
 *
 * @param {number} latitude  - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} [radiusMeters=15000] - Search radius in meters (default 15km)
 * @param {number} [maxResults=5] - Max number of places to return
 * @param {string[]} [excludeNames=[]] - Place names to exclude (already in DB)
 * @returns {object[]} - Array of place objects with name, location, rating, photos
 */
async function searchNearby(latitude, longitude, radiusMeters = 15000, maxResults = 5, excludeNames = []) {
    const apiKey = config.googlePlaces?.apiKey;
    if (!apiKey) return [];

    try {
        // Use Text Search with locationBias for better tourism results
        const response = await fetch(`${PLACES_BASE_URL}/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.googleMapsUri',
            },
            body: JSON.stringify({
                textQuery: 'tourist attractions and places of interest',
                locationBias: {
                    circle: {
                        center: { latitude, longitude },
                        radius: radiusMeters,
                    },
                },
                pageSize: maxResults + excludeNames.length + 5, // fetch extra in case we need to filter
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`⚠️ [Places] Nearby Search failed (${response.status}):`, errText);
            return [];
        }

        const data = await response.json();
        const places = data.places || [];

        // Filter out excluded names and limit to maxResults
        const excludeSet = new Set(excludeNames.map((n) => n.toLowerCase().trim()));
        const filtered = places
            .filter((p) => {
                const name = p.displayName?.text?.toLowerCase().trim();
                return name && !excludeSet.has(name);
            })
            .slice(0, maxResults);

        return filtered;
    } catch (error) {
        console.error('⚠️ [Places] Nearby Search error:', error.message);
        return [];
    }
}

/**
 * Search nearby places and resolve their photos.
 * Returns structured destination-like objects ready for DB insertion.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [radiusMeters=15000]
 * @param {number} [maxResults=5]
 * @param {string[]} [excludeNames=[]]
 * @returns {object[]} - Array of { name, address, latitude, longitude, rating, reviewCount, gmapsUrl, images }
 */
async function searchNearbyWithPhotos(latitude, longitude, radiusMeters = 15000, maxResults = 5, excludeNames = []) {
    const places = await searchNearby(latitude, longitude, radiusMeters, maxResults, excludeNames);

    const results = [];
    for (const place of places) {
        const name = place.displayName?.text || 'Unknown';

        // Resolve first photo
        let images = [];
        if (place.photos && place.photos.length > 0) {
            const photoUrl = await getPhotoUrl(place.photos[0].name);
            if (photoUrl) images = [photoUrl];
        }

        results.push({
            name,
            address: place.formattedAddress || null,
            latitude: place.location?.latitude || null,
            longitude: place.location?.longitude || null,
            rating: place.rating || null,
            reviewCount: place.userRatingCount || null,
            gmapsUrl: place.googleMapsUri || null,
            images,
        });
    }

    return results;
}

module.exports = {
    searchPlace,
    getPhotoUrl,
    fetchPhotosForDestination,
    searchNearby,
    searchNearbyWithPhotos,
};
