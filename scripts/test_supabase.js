const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwzbofvjthveifxqjypb.supabase.co';
const supabaseAnonKey = 'sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error } = await supabase.from('repairs').select('status');
    if (error) console.error(error);
    
    // Get unique statuses
    const statuses = new Set(data.map(d => d.status));
    console.log("Unique statuses found in repairs table:", Array.from(statuses));
}

test();
