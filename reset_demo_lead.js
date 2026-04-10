
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findAndReset() {
  const { data: leads, error: fetchError } = await supabase.from('leads').select('id, name');
  if (fetchError) {
    console.error('Error fetching leads:', fetchError);
    return;
  }

  const demoLead = leads.find(l => l.name.toLowerCase().includes('demo'));
  if (demoLead) {
    console.log(`Found lead: ${demoLead.name} (${demoLead.id})`);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 10);
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'visiting',
        feedback_sent: false,
        feedback_sent_at: null,
        created_at: sevenDaysAgo.toISOString()
      })
      .eq('id', demoLead.id);

    if (updateError) console.error('Error updating:', updateError);
    else console.log('Lead successfully moved back to Opinion.');
  } else {
    console.log('No lead with "demo" in name found.');
  }
}

findAndReset();
