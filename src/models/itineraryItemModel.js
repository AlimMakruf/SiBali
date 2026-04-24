// ------------------------------------------------------------
// Itinerary Item Model — Supabase (table: itinerary_items)
// ------------------------------------------------------------

const supabase = require('../config/supabase');

const ItineraryItemModel = {
    async create(data) {
        const { data: result, error } = await supabase
            .from('itinerary_items')
            .insert({
                itinerary_day_id: data.itineraryDayId,
                destination_id: data.destinationId || null,
                visit_time: data.visitTime || null,
                order_in_day: data.orderInDay || 1,
                notes: data.notes || null,
            })
            .select('*, destinations(id, name, images, area)')
            .single();
        if (error) throw error;
        return result;
    },

    async getByDayId(dayId) {
        const { data, error } = await supabase
            .from('itinerary_items')
            .select('*, destinations(id, name, images, area, rating_avg)')
            .eq('itinerary_day_id', dayId)
            .order('order_in_day', { ascending: true });
        if (error) throw error;
        return data;
    },

    async update(id, fields) {
        const allowed = ['destination_id', 'visit_time', 'order_in_day', 'notes'];
        const updates = {};
        for (const key of allowed) {
            if (fields[key] !== undefined) updates[key] = fields[key];
        }
        const { data, error } = await supabase
            .from('itinerary_items')
            .update(updates)
            .eq('id', id)
            .select('*, destinations(id, name, images, area)')
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { data, error } = await supabase
            .from('itinerary_items')
            .delete()
            .eq('id', id)
            .select()
            .single();
        if (error && error.code === 'PGRST116') return null;
        if (error) throw error;
        return data;
    },
};

module.exports = ItineraryItemModel;
