// ------------------------------------------------------------
// Supabase Client — Initialize connection to Supabase
// ------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let supabase = null;

if (config.supabase.url && config.supabase.serviceKey) {
    supabase = createClient(config.supabase.url, config.supabase.serviceKey);
} else {
    console.warn(
        '⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in .env'
    );
    console.warn(
        '   Database features will not work until credentials are set.'
    );
}

module.exports = supabase;
