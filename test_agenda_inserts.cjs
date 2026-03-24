
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test_inserts() {
  const { data: leadData } = await supabase.from('leads').select('id').limit(1);
  if (!leadData || leadData.length === 0) {
    // Try to create a lead if none exists
    const { data: newLead } = await supabase.from('leads').insert([{ name: 'Test Lead' }]).select('id');
    if (!newLead) { console.error('Could not find or create lead'); return; }
    test_lead_id = newLead[0].id;
  } else {
    test_lead_id = leadData[0].id;
  }

  // Get current user id from auth (might need a session, so we try to get it from profiles)
  const { data: profile } = await supabase.from('profiles').select('id').limit(1);
  const user_id = profile ? profile[0].id : null;

  const types = ['Llamada', 'Email', 'WhatsApp', 'Visita', 'Reunión'];
  
  for (const type of types) {
    console.log(`Testing type: ${type}`);
    const { error } = await supabase.from('agenda').insert([
      {
        title: `Test ${type}`,
        type: type,
        due_date: new Date().toISOString(),
        lead_id: test_lead_id,
        user_id: user_id,
        completed: false
      }
    ]);
    if (error) {
      console.error(`Error with ${type}:`, error.message);
    } else {
      console.log(`Success with ${type}`);
    }
  }
}

test_inserts();
