import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching new leads...');
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, name')
    .eq('status', 'new');

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
    return;
  }

  console.log(`Found ${leads.length} new leads. Checking for actions...`);
  
  let updatedCount = 0;

  for (const lead of leads) {
    const { data: agendaTasks } = await supabase
      .from('agenda')
      .select('id')
      .eq('lead_id', lead.id)
      .limit(1);

    const { data: sentDocs } = await supabase
      .from('sent_documents')
      .select('id')
      .eq('lead_id', lead.id)
      .limit(1);
      
    const { data: history } = await supabase
      .from('lead_history')
      .select('id')
      .eq('lead_id', lead.id)
      .in('event_type', ['contact', 'email_sent', 'whatsapp_sent', 'feedback_sent'])
      .limit(1);

    const hasAction = 
      (agendaTasks && agendaTasks.length > 0) || 
      (sentDocs && sentDocs.length > 0) ||
      (history && history.length > 0);

    if (hasAction) {
      console.log(`Lead ${lead.name} (${lead.id}) has actions. Updating to 'contacted'...`);
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'contacted' })
        .eq('id', lead.id);
        
      if (updateError) {
        console.error(`Failed to update ${lead.name}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished! Updated ${updatedCount} leads to 'contacted'.`);
}

run().catch(console.error);
