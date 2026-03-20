
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('inventory')
    .insert([{ n_orden: 'TEST', precio: 100, planta: 'TEST' }]);

  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted TEST row.');
    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
    console.log('New count:', count);
  }
}

testInsert();
