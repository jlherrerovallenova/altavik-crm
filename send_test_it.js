
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';
const supabase = createClient(supabaseUrl, supabaseKey);

async function prepareAndSendTest() {
  // 1. Find the lead (any lead named demo)
  const { data: leads } = await supabase.from('leads').select('id, name').ilike('name', '%demo%');
  
  if (leads && leads.length > 0) {
    const lead = leads[0];
    console.log(`Found lead: ${lead.name}`);
    
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    // 2. Reset him and set the email
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email: 'juan@terravall.com',
        status: 'visiting',
        feedback_sent: false,
        created_at: tenDaysAgo.toISOString()
      })
      .eq('id', lead.id);

    if (updateError) console.error('Error resetting lead:', updateError);
    else console.log('Lead reset and email set to juan@terravall.com');
  } else {
    // 3. Create him if not exists
    console.log('Lead not found, creating new...');
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const { data: newData, error: insertError } = await supabase
      .from('leads')
      .insert([{
        name: 'Cliente Demo',
        email: 'juan@terravall.com',
        status: 'visiting',
        feedback_sent: false,
        created_at: tenDaysAgo.toISOString(),
        source: 'Web'
      }])
      .select();

    if (insertError) console.error('Error inserting lead:', insertError);
    else console.log('New Cliente Demo created with juan@terravall.com');
  }
}

prepareAndSendTest();
