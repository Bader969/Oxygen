import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwzbofvjthveifxqjypb.supabase.co';
const supabaseAnonKey = 'sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const customers = [
    { name: 'Sarah Jenkins', phone: '+1 555-0100', preferred_language: 'tr' },
    { name: 'Marcus Thorne', phone: '+1 555-0101', preferred_language: 'tr' },
    { name: 'Elena Rostova', phone: '+1 555-0102', preferred_language: 'ar' },
    { name: 'David Kim', phone: '+1 555-0103', preferred_language: 'tr' },
    { name: 'Ahmet Yılmaz', phone: '+90 555-1234', preferred_language: 'tr' },
    { name: 'Mehmet Öz', phone: '+90 555-5678', preferred_language: 'tr' },
    { name: 'Omar Al-Fayed', phone: '+971 55-0000', preferred_language: 'ar' },
    { name: 'Fatima Hassan', phone: '+971 55-1111', preferred_language: 'ar' },
];

const devices = [
    { device_model: 'iPhone 14 Pro', issue_description: 'Screen Replacement', cost: 150 },
    { device_model: 'MacBook Air M2', issue_description: 'Battery Issue', cost: 200 },
    { device_model: 'iPad Pro 12.9"', issue_description: 'Logic Board Repair', cost: 350 },
    { device_model: 'Apple Watch Ultra', issue_description: 'Diagnostic', cost: 50 },
    { device_model: 'Samsung Galaxy S23', issue_description: 'Water Damage', cost: 180 },
    { device_model: 'iPhone 13', issue_description: 'Charging Port Replacement', cost: 80 },
    { device_model: 'MacBook Pro M1', issue_description: 'Keyboard Replacement', cost: 120 },
    { device_model: 'Google Pixel 7', issue_description: 'Camera Glass Broken', cost: 90 },
];

async function seed() {
    console.log('Seeding data...');
    
    // Clear existing data (optional, but good for fresh start)
    // RLS might block delete without service key, so we just append.
    
    for (let i = 0; i < 15; i++) {
        // Pick random customer
        const custData = customers[Math.floor(Math.random() * customers.length)];
        
        // Insert Customer
        const { data: cust, error: custErr } = await supabase
            .from('customers')
            .insert(custData)
            .select()
            .single();
            
        if (custErr) {
            console.error('Error inserting customer:', custErr);
            continue;
        }

        // Create 1-2 repairs per customer
        const numRepairs = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numRepairs; j++) {
            const devData = devices[Math.floor(Math.random() * devices.length)];
            
            // Randomly assign a status
            const statuses = ['pending', 'in_progress', 'completed'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            // If completed, cost should be real, else could be null
            const cost = randomStatus === 'completed' ? devData.cost : (Math.random() > 0.5 ? devData.cost : null);
            
            const { error: repErr } = await supabase
                .from('repairs')
                .insert({
                    customer_id: cust.id,
                    device_model: devData.device_model,
                    issue_description: devData.issue_description,
                    cost: cost,
                    status: randomStatus
                });
                
            if (repErr) {
                console.error('Error inserting repair:', repErr);
            }
        }
    }
    
    console.log('Seeding complete!');
}

seed();
