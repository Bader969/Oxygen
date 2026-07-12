import { createClient } from '@supabase/supabase-js';

// Pre-filled with your hosted Supabase project credentials
export const supabaseUrl = 'https://hwzbofvjthveifxqjypb.supabase.co';
export const supabaseAnonKey = 'sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
