import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  const { data: leads } = await supabase.from('leads').select('id, lead_number, assigned_to, created_by, status');
  const { data: profiles } = await supabase.from('profiles').select('*');

  console.log('Leads:', JSON.stringify(leads, null, 2));
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
}

checkLeads();
