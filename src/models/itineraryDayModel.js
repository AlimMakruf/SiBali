// ------------------------------------------------------------
// Itinerary Day Model — Supabase (table: itinerary_days)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const ItineraryDayModel = {
    async create(itineraryId, dayNumber, date = null) {
        const { data, error } = await supabase
            .from('itinerary_days')
            .insert({ itinerary_id: itineraryId, day_number: dayNumber, date })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getByItineraryId(itineraryId) {
        const { data, error } = await supabase
            .from('itinerary_days')
            .select('*, itinerary_items(id, destination_id, visit_time, order_in_day, notes, destinations(*))')
            .eq('itinerary_id', itineraryId)
            .order('day_number', { ascending: true });
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { data, error } = await supabase
            .from('itinerary_days')
            .delete()
            .eq('id', id)
            .select()
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = ItineraryDayModel;
