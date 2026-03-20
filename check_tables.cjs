
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error leads count:', error);
  } else {
    console.log('Total rows in leads:', data ? data.length : '?', 'Count:', error ? '?' : 'exact');
    // Using select with count exact
  }
  
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log('Leads count:', leadsCount);

  const { count: inventoryCount } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
  console.log('Inventory count:', inventoryCount);
}

listTables();
