import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase Service Role Key.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify who is making the request
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    
    const { data: { user: requestingUser }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    if (verifyError || !requestingUser) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch the target user's profile to check if it's the Super Admin
    const { data: targetUser } = await supabaseAdmin.from('profiles').select('email').eq('id', id).single();
    if (targetUser && targetUser.email === 'info@nexgenautotransport.com') {
      return res.status(403).json({ error: 'The Super Admin account cannot be deleted by anyone.' });
    }

    // 0. Unassign from all records to prevent foreign key constraint violations
    await supabaseAdmin.from('leads').update({ assigned_to: null }).eq('assigned_to', id);
    await supabaseAdmin.from('leads').update({ created_by: null }).eq('created_by', id);
    await supabaseAdmin.from('tasks').update({ assigned_to: null }).eq('assigned_to', id);

    // 1. Delete from public.profiles table first (because of foreign key constraints!)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Error deleting profile row:', profileError);
      return res.status(500).json({ error: 'Failed to delete profile: ' + profileError.message });
    }

    // 2. Delete the user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      // If we failed to delete from auth, we might have an orphaned profile, 
      // but usually the profile deletion succeeds so we shouldn't fail too hard on the message.
      return res.status(400).json({ error: authError.message });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
