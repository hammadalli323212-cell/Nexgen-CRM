import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password, name, role, smtp_password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Initialize Supabase with the SERVICE ROLE KEY
    // The Service Role Key allows us to bypass RLS and create users securely on the backend
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

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { full_name: name }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const newUserId = authData.user.id;

    // 2. Insert the user into the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: newUserId,
          email: email,
          full_name: name,
          role: role || 'user',
          smtp_password: smtp_password || null
        }
      ]);

    if (profileError) {
      console.error('Error creating profile row:', profileError);
      // We don't fail the request completely because the auth user was created,
      // but we should ideally handle this more gracefully.
      // If full_name column doesn't exist, we can fallback to just id and role.
      
      const { error: fallbackError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: newUserId,
            role: role || 'user',
            smtp_password: smtp_password || null
          }
        ]);
        
      if (fallbackError) {
        return res.status(500).json({ error: 'User created in Auth, but failed to create profile: ' + fallbackError.message });
      }
    }

    return res.status(200).json({ success: true, user: authData.user });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
