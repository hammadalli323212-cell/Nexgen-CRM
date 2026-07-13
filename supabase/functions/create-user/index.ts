import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if the user making the request is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    // Get the JWT from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process request
    const { email, fullName, role } = await req.json()

    if (!email || !fullName || !role) {
      throw new Error('Missing required fields: email, fullName, role')
    }

    if (role !== 'admin' && role !== 'user') {
      throw new Error('Invalid role specified')
    }

    // Invite the user via email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName }
    })

    if (inviteError) {
      throw inviteError
    }

    const newUserId = inviteData.user.id

    const [firstName, ...lastNameArr] = fullName.split(' ');
    const lastName = lastNameArr.join(' ');
    
    // Create the profile record
    const { error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        first_name: firstName || 'Unknown',
        last_name: lastName || '',
        role: role
      })

    // If profile insert fails (e.g. they already exist?), we handle gracefully
    // But since it's a new invite, it should succeed.
    if (insertProfileError) {
      console.error('Failed to create profile:', insertProfileError)
      // Note: the user is still created in auth.users
    }

    return new Response(
      JSON.stringify({ message: 'User invited successfully', user: inviteData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
