import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, email, password, name, role, smtp_password, phone } = req.body;

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

    // Fetch the requesting user's profile
    const { data: reqUserProfile } = await supabaseAdmin.from('profiles').select('role, email').eq('id', requestingUser.id).single();
    const isReqSuperAdmin = reqUserProfile?.role === 'super_admin' || reqUserProfile?.email === 'info@nexgenautotransport.com';

    // Fetch the target user's profile
    const { data: targetUser } = await supabaseAdmin.from('profiles').select('email, role').eq('id', id).single();
    
    // Super Admin Protection Logic
    let finalRole = role;
    
    if (role === 'super_admin' && !isReqSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Administrators can assign the Super Admin role.' });
    }

    if (targetUser && targetUser.email === 'info@nexgenautotransport.com') {
      if (requestingUser.email !== 'info@nexgenautotransport.com') {
        return res.status(403).json({ error: 'Only the main Super Admin can modify this account.' });
      }
      // Even if Hammad A is editing himself, he cannot demote himself from admin
      finalRole = role === 'super_admin' ? 'super_admin' : 'admin';
    }

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
    if (finalRole) profileData.role = finalRole;
    if (smtp_password !== undefined) profileData.smtp_password = smtp_password;
    if (phone !== undefined) profileData.phone = phone;

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
