// ------------------------------------------------------------
// Destination Model — Supabase (table: destinations)
// Replaces the old trendingPlaceModel
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const DestinationModel = {
    /**
     * List destinations with optional filters.
     * @param {object} filters
     * @param {string}  [filters.categoryId]
     * @param {boolean} [filters.isTrending]
     * @param {string}  [filters.search] — text search on name
     * @param {number}  [filters.limit=20]
     * @param {number}  [filters.offset=0]
     * @returns {object[]}
     */
    async findAll({ categoryId, isTrending, search, limit = 20, offset = 0 } = {}) {
        let query = supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (categoryId) query = query.eq('category_id', categoryId);
        if (typeof isTrending === 'boolean') query = query.eq('is_trending', isTrending);
        if (search) query = query.ilike('name', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Find a single destination by ID (with category info).
     * @param {string} id
     * @returns {object|null}
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('id', id)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
    /**
     * Find a destination by exact name (case-insensitive).
     * @param {string} name
     * @returns {object|null}
     */
    async findByName(name) {
        const { data, error } = await supabase
            .from('destinations')
            .select('id, name, images, area')
            .ilike('name', name)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
    /**
     * Get trending destinations, sorted newest first.
     * @param {number} limit
     * @returns {object[]}
     */
    async getTrending(limit = 10) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .eq('is_trending', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    /**
     * Create a single destination.
     * @param {object} dest
     * @returns {object}
     */
    async create(dest) {
        const { data, error } = await supabase
            .from('destinations')
            .insert(dest)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a destination by ID.
     * @param {string} id
     * @param {object} fields — columns to update (e.g. { images: [...] })
     * @returns {object}
     */
    async update(id, fields) {
        const { data, error } = await supabase
            .from('destinations')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Bulk upsert destinations from Gemini (trending import).
     * Deactivates old trending, then inserts new batch.
     * Automatically maps Gemini's category string to category_id.
     * @param {object[]} places
     * @returns {object[]}
     */
    async bulkUpsert(places) {
        const CategoryModel = require('./categoryModel');
        const { fetchPhotosForDestination } = require('../services/googlePlacesService');

        // Deactivate old trending places
        const { error: deactivateError } = await supabase
            .from('destinations')
            .update({ is_trending: false, updated_at: new Date().toISOString() })
            .eq('is_trending', true);

        if (deactivateError) throw deactivateError;

        // Build a local cache for category lookups to avoid repeated queries
        const categoryCache = {};
        async function resolveCategoryId(categoryName) {
            if (!categoryName) return null;
            const key = categoryName.toLowerCase().trim();
            if (key in categoryCache) return categoryCache[key];
            const found = await CategoryModel.findOrCreate(categoryName);
            categoryCache[key] = found ? found.id : null;
            return categoryCache[key];
        }

        // Insert new batch — map Gemini response to DB columns
        const rows = [];
        for (const p of places) {
            const categoryId = await resolveCategoryId(p.category);
            rows.push({
                name: p.destinationName || p.name,
                category_id: categoryId,
                description: p.about || p.description || '',
                ai_description: p.aiInsight || null,
                about: p.about || null,
                address: (p.contactInfo && p.contactInfo.location) || p.location || null,
                area: (p.contactInfo && p.contactInfo.location) || p.location || p.area || null,
                latitude: (p.coordinates && p.coordinates.latitude) || null,
                longitude: (p.coordinates && p.coordinates.longitude) || null,
                gmaps_url: p.gmapsUrl || p.gmaps_url || null,
                phone: (p.contactInfo && p.contactInfo.phone) || null,
                website: (p.contactInfo && p.contactInfo.website) || null,
                amenities: Array.isArray(p.amenities) ? p.amenities : [],
                rating_avg: p.rating || null,
                is_trending: true,
                is_active: true,
            });
        }

        // Fetch photos from Google Places API in parallel for all rows
        const photoResults = await Promise.allSettled(
            rows.map((row) => fetchPhotosForDestination(row.name, row.area, 1))
        );
        for (let i = 0; i < rows.length; i++) {
            const result = photoResults[i];
            rows[i].images = (result.status === 'fulfilled' && result.value.length > 0)
                ? result.value
                : [];
        }

        const { data, error } = await supabase
            .from('destinations')
            .insert(rows)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Search destinations by name or description.
     * @param {string} query
     * @param {number} limit
     * @returns {object[]}
     */
    async search(query, limit = 20) {
        const { data, error } = await supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .order('rating_avg', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    /**
     * Find nearby destinations within a radius using bounding-box + Haversine.
     * @param {number} lat - Center latitude
     * @param {number} lng - Center longitude
     * @param {number} [radiusKm=15] - Search radius in km
     * @param {number} [limit=5] - Max results
     * @param {string} [excludeId] - Destination ID to exclude (the source destination)
     * @returns {object[]} - Destinations sorted by distance (nearest first)
     */
    async findNearby(lat, lng, radiusKm = 15, limit = 5, excludeId = null) {
        // Bounding box approximation (1° lat ≈ 111km, 1° lng ≈ 111km * cos(lat))
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

        let query = supabase
            .from('destinations')
            .select('*, categories(id, name, icon_url)')
            .eq('is_active', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .gte('latitude', lat - latDelta)
            .lte('latitude', lat + latDelta)
            .gte('longitude', lng - lngDelta)
            .lte('longitude', lng + lngDelta);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Haversine distance calculation for precise filtering
        function haversineKm(lat1, lng1, lat2, lng2) {
            const R = 6371;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLng = ((lng2 - lng1) * Math.PI) / 180;
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // Filter by exact distance and sort
        return (data || [])
            .map((d) => ({
                ...d,
                _distance_km: haversineKm(lat, lng, d.latitude, d.longitude),
            }))
            .filter((d) => d._distance_km <= radiusKm)
            .sort((a, b) => a._distance_km - b._distance_km)
            .slice(0, limit);
    },
};

module.exports = DestinationModel;
