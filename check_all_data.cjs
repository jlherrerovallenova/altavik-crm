
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllData() {
  const { data, error } = await supabase
    .from('inventory')
    .select('n_orden, sup_terrazas, sup_porche')
    .limit(10);

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkAllData();
