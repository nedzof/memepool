import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

declare global {
  var supabase: ReturnType<typeof createClient<Database>> | undefined;
}

const supabaseClient = globalThis.supabase ?? createClient<Database>(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV !== 'production') globalThis.supabase = supabaseClient;

export { supabaseClient as supabase };
export default supabaseClient; 