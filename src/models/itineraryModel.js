// ------------------------------------------------------------
// Itinerary Model — Supabase (table: itineraries)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const ItineraryModel = {
    async create(data) {
        const { data: result, error } = await supabase
            .from('itineraries')
            .insert({
                user_id: data.userId,
                title: data.title,
                cover_image: data.coverImage || null,
                start_date: data.startDate || null,
                duration_days: data.durationDays || 1,
                duration_nights: data.durationNights || 0,
                budget: data.budget || null,
                total_destinations: data.totalDestinations || 0,
                is_ai_generated: data.isAiGenerated || false,
                area: data.area || null,
                budget_range: data.budgetRange || null,
                companion_type: data.companionType || null,
                custom_preferences: data.customPreferences || null,
                discovery_inputs: data.discoveryInputs || {},
                ai_status: data.aiStatus || 'done',
            })
            .select()
            .single();
        if (error) throw error;
        return result;
    },

    async findByUserId(userId) {
        const { data, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async findById(id) {
        const { data, error } = await supabase
            .from('itineraries')
            .select('*, itinerary_days(id, day_number, date, created_at, itinerary_items(id, destination_id, visit_time, order_in_day, notes, created_at, destinations(*)))')
            .eq('id', id)
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },

    async update(id, userId, fields) {
        const allowed = [
            'title', 'cover_image', 'start_date', 'duration_days', 'duration_nights',
            'budget', 'total_destinations', 'area', 'budget_range', 'companion_type',
            'custom_preferences', 'discovery_inputs', 'ai_status'
        ];
        const updates = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
            if (fields[key] !== undefined) updates[key] = fields[key];
        }
        const { data, error } = await supabase
            .from('itineraries')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },

    async delete(id, userId) {
        const { data, error } = await supabase
            .from('itineraries')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = ItineraryModel;
