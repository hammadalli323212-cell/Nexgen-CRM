import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lead_number } = req.query;

  if (!lead_number) {
    return res.status(400).json({ error: 'Missing lead_number' });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('assignee:profiles!assigned_to(first_name, last_name, email)')
      .eq('lead_number', lead_number)
      .single();

    if (error || !data || !data.assignee) {
      return res.status(200).json({
        name: 'NexGen Auto Transport',
        phone: '(832) 886-1321',
        email: 'info@nexgenautotransport.com'
      });
    }

    return res.status(200).json({
      name: `${data.assignee.first_name || ''} ${data.assignee.last_name || ''}`.trim() || 'NexGen Auto Transport',
      phone: '(832) 886-1321',
      email: data.assignee.email || 'info@nexgenautotransport.com'
    });

  } catch (err) {
    console.error('get-agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
