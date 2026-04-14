const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'leads' });
  if (error) {
    // If RPC doesn't exist, try common approach
    console.log("RPC Error (expected if not defined):", error.message);
    const { data: d2, error: e2 } = await supabase.from('leads').select('*').limit(1);
    if (d2 && d2.length > 0) {
      console.log("Columns found via select:", Object.keys(d2[0]));
    } else {
        console.log("Table is empty or RLS prevents access.");
    }
  } else {
    console.log("Columns via RPC:", data);
  }
}

listColumns();
