import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las credenciales de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Configúralas en el panel de Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
