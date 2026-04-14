
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('agenda').select('*').limit(1);
  if (error) {
    console.error('Error fetching agenda:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in agenda:', Object.keys(data[0]));
  } else {
    console.log('Agenda table is empty, cannot detect columns this way.');
    // Try to insert a dummy row to see error
    const { error: insertError } = await supabase.from('agenda').insert([{ title: 'test' }]);
    console.log('Insert error (might show missing columns):', insertError?.message);
  }
}

checkColumns();
