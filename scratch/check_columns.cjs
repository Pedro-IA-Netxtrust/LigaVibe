
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('league_matches')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching league_matches:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in league_matches:', Object.keys(data[0]));
  } else {
    console.log('No data found in league_matches to check columns.');
  }
}

checkColumns();
