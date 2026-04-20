import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  // @ts-ignore
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // @ts-ignore
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las credenciales de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Por favor, configúralas en el panel de Secrets de AI Studio.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Proxy the supabase constant to getSupabase() to maintain compatibility with existing code
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    return (getSupabase() as any)[prop];
  }
});

/**
 * Utility to fetch data with a standardized response
 */
export async function fetchData<T>(query: any) {
  const { data, error } = await query;
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  return data as T[];
}
