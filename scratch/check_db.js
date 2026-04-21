
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  try {
    const { data, error } = await supabase.from('league_matches').select('*').limit(1);
    if (error) {
      console.error('Error fetching league_matches:', error.message);
      // Try to get one category to see if connection works
      const { data: cat, error: catErr } = await supabase.from('league_categories').select('*').limit(1);
      if (catErr) console.error('Error fetching categories:', catErr.message);
      else console.log('Successfully connected. Categories found.');
    } else {
      console.log('Columns in league_matches:');
      console.log(JSON.stringify(Object.keys(data[0] || {}), null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}
checkColumns();
