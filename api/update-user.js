import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, email, password, name, role } = req.body;

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

    // 1. Update the user in Supabase Auth
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (name) updateData.user_metadata = { full_name: name };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Update the user in public.profiles table
    const profileData = {};
    if (email) profileData.email = email;
    if (name) profileData.full_name = name;
    if (role) profileData.role = role;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('id', id);

    if (profileError) {
      console.error('Error updating profile row:', profileError);
      return res.status(500).json({ error: 'User updated in Auth, but failed to update profile: ' + profileError.message });
    }

    return res.status(200).json({ success: true, user: authData.user });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
