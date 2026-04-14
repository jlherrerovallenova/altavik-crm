const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  const { error } = await supabase.from('leads').select('feedback_rating, feedback_responded_at, feedback_sent, feedback_sent_at').limit(1);
  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Columns exist!");
  }
}

checkCols();
