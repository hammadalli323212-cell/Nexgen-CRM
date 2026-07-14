const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('leads').select('*').eq('lead_number', 50);
  console.log('Lead 50:', JSON.stringify(data, null, 2));
  
  const { data: users, error: err2 } = await supabase.auth.admin.listUsers();
  console.log('Users:', users.users.map(u => ({ id: u.id, email: u.email })));
}
check();
