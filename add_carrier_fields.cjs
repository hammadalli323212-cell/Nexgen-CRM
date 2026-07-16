require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const query = `
    ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS carrier_company_name text,
    ADD COLUMN IF NOT EXISTS carrier_company_number text,
    ADD COLUMN IF NOT EXISTS carrier_dispatch_number text,
    ADD COLUMN IF NOT EXISTS carrier_driver_number text,
    ADD COLUMN IF NOT EXISTS carrier_email text,
    ADD COLUMN IF NOT EXISTS carrier_mc_number text,
    ADD COLUMN IF NOT EXISTS carrier_usdot_number text;
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: query });
  console.log('rpc exec_sql error?', error);
  if (error && error.code === 'PGRST202') {
     console.log('exec_sql not found, trying query_db...');
     const { data: d2, error: e2 } = await supabase.rpc('query_db', { query: query });
     console.log('rpc query_db error?', e2);
  }
})();
