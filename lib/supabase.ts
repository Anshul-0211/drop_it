import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create client only if environment variables are available
// This allows builds without full env setup
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as any);

// For server-side operations, use the service role key
export const supabaseAdmin = 
  supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)
    ? createClient(
        supabaseUrl,
        (supabaseServiceRoleKey || supabaseAnonKey) as string
      )
    : ({} as any);
