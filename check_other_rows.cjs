
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nbrbggvdtbvaoxsllemf.supabase.co';
const supabaseKey = 'sb_publishable_Xu11tC3ME-aYxuMxVrOZdw_WVrgM2mD';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRowsCount() {
  const { count, error } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching count:', error);
  } else {
    console.log('Total rows in inventory (mirapinos project):', count);
  }
}

checkRowsCount();
