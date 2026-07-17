import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://dsoubdjlpqgevqpywfor.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzb3ViZGpscHFnZXZxcHl3Zm9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5OTgxNywiZXhwIjoyMDk5MTc1ODE3fQ.RxXJ7gE6YnkGIG-27k66hC9najk3pI0MEJwAxko8hPY');
async function test() {
  const { data, error } = await supabase.from('leads').select('lead_number, customers(first_name, last_name)').eq('lead_number', 91);
  console.log(JSON.stringify(data, null, 2));
}
test();
