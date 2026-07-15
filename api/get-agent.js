import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lead_number, agent_id } = req.query;

  if (!lead_number) {
    return res.status(400).json({ error: 'Missing lead_number' });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let profileData = null;

    if (agent_id) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, full_name, email')
        .eq('id', agent_id)
        .single();
      profileData = data;
    }

    if (!profileData) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('assignee:profiles!assigned_to(first_name, last_name, full_name, email)')
        .eq('lead_number', lead_number)
        .single();
      profileData = data?.assignee;
    }

    if (!profileData) {
      return res.status(200).json({
        name: 'NexGen Auto Transport',
        phone: '(832) 886-1321',
        email: 'info@nexgenautotransport.com'
      });
    }

    const fallbackName = profileData.full_name || 'NexGen Auto Transport';
    const computedName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || fallbackName;

    return res.status(200).json({
      name: computedName,
      phone: '(832) 886-1321',
      email: profileData.email || 'info@nexgenautotransport.com'
    });

  } catch (err) {
    console.error('get-agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
