import { createClient } from '@supabase/supabase-js';

// NOTA: Estas credenciales se han puesto directamente para descartar problemas de variables en Vercel.
const supabaseUrl = 'https://hoijgdljilujhsxeojvk.supabase.co';
const supabaseAnonKey = 'sb_publishable_cEz-a7Gv8lN8ikMsirGiMw_3JJlVz3G';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
