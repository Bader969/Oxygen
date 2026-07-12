const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwzbofvjthveifxqjypb.supabase.co';
const supabaseAnonKey = 'sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateMockData() {
    console.log("Generating mock customers...");
    
    // Create customers
    const customers = [
        { name: 'Sarah Jenkins', phone: '+15551234567', preferred_language: 'tr' },
        { name: 'Marcus Thorne', phone: '+15559876543', preferred_language: 'ar' },
        { name: 'Elena Rostova', phone: '+15555551212', preferred_language: 'tr' },
        { name: 'David Kim', phone: '+15553334444', preferred_language: 'ar' }
    ];
    
    const insertedCustomers = [];
    for (const c of customers) {
        const { data, error } = await supabase.from('customers').insert([c]).select().single();
        if (error) throw error;
        insertedCustomers.push(data);
    }
    
    console.log("Generated 4 customers. Generating tickets...");
    
    // Create tickets
    const tickets = [
        { customer_id: insertedCustomers[0].id, device_model: 'iPhone 14 Pro', issue_description: 'Screen Replacement', status: 'pending', cost: 150 },
        { customer_id: insertedCustomers[1].id, device_model: 'MacBook Air M2', issue_description: 'Battery Issue', status: 'pending', cost: 85 },
        { customer_id: insertedCustomers[2].id, device_model: 'iPad Pro 12.9"', issue_description: 'Logic Board Repair', status: 'in_progress', cost: 250 },
        { customer_id: insertedCustomers[3].id, device_model: 'Samsung Galaxy S23', issue_description: 'Diagnostic', status: 'quality_check', cost: 45 },
        { customer_id: insertedCustomers[0].id, device_model: 'Apple Watch Ultra', issue_description: 'Screen polish', status: 'ready_for_pickup', cost: 100 }
    ];
    
    for (const t of tickets) {
        const { error } = await supabase.from('repairs').insert([t]);
        if (error) throw error;
    }
    
    console.log("Generated 5 tickets successfully!");
}

generateMockData().catch(console.error);
