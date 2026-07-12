const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwzbofvjthveifxqjypb.supabase.co';
const supabaseAnonKey = 'sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
    const { data, error } = await supabase.auth.signUp({
        email: 'technician@oxygen.com',
        password: 'password123',
        options: {
            data: { role: 'technician' }
        }
    });
    console.log("Signup technician result:", error || data);
}

testSignup();
