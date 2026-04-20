import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Error: Faltan las credenciales de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      return null;
    }
    if (!supabaseInstance) {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (supabaseInstance as any)[prop];
  }
});
