const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLeadsCols() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.log("Error:", error.message);
  } else if (data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // If empty, try to get schema via an intentional error
    const { error: err2 } = await supabase.from('leads').insert({ non_existent_column: 'test' });
    console.log("Error message (should contain schema info):", err2.message);
  }
}

checkLeadsCols();
