
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .rpc('get_table_info', { table_name: 'agenda' });
    
  if (error) {
    console.log('Error checking with RPC. Trying direct select.');
    const { data: data2, error: error2 } = await supabase.from('agenda').select('*').limit(1);
    console.log('Data:', data2);
    if (error2) console.error('Error:', error2);
  } else {
    console.log('Table Info:', data);
  }
}

check();
