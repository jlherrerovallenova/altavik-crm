
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Try to load from .env if it exists
if (fs.existsSync('.env')) {
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oenaworwtrblkmjvwjfs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sifp1t0oYmNIi6Vc5C8pPg_hEwcMJof';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking agenda table...');
  const { data: agendaData, error: agendaError } = await supabase.from('agenda').select('id').limit(1);
  if (agendaError) {
    console.log('Agenda table error:', agendaError.message);
  } else {
    console.log('Agenda table exists.');
  }

  console.log('Checking tasks table...');
  const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('id').limit(1);
  if (tasksError) {
    console.log('Tasks table error:', tasksError.message);
  } else {
    console.log('Tasks table exists.');
  }
}

checkTables();
