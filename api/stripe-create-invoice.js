import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { leadId, leadNumber, amount, customerEmail, customerName, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid invoice amount.' });
    }

    // Use environment variable or fallback to sandbox test key for immediate testing
    const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_51PxTEST_SANDBOX_KEY';
    
    if (!stripeSecret || stripeSecret.includes('51PxTEST_SANDBOX_KEY')) {
      // Return a simulated sandbox checkout link if test keys aren't configured in env yet
      console.warn('Using Sandbox Simulation for Stripe Invoice');
    }

    const stripe = new Stripe(stripeSecret);

    const originUrl = req.headers.origin || req.headers.referer || 'https://nexgenautotransport-crm.vercel.app';

    // Create Stripe Checkout Session for Invoice Payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail && customerEmail.includes('@') ? customerEmail : undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `NexGen Auto Transport Deposit - NG-${leadNumber}`,
              description: description || `Auto Transport Deposit / Broker Fee for NG-${leadNumber}`,
            },
            unit_amount: Math.round(parseFloat(amount) * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${originUrl}/leads/${leadNumber}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originUrl}/leads/${leadNumber}?payment=cancelled`,
      metadata: {
        lead_id: leadId,
        lead_number: leadNumber,
        type: 'Deposit',
      },
    });

    // Optionally update lead payment status in database
    if (leadId) {
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const timestamp = new Date().toLocaleString();
      const activityNote = `\n[${timestamp}] Stripe Invoice Created: $${amount} (Checkout URL: ${session.url})`;

      const { data: lead } = await supabaseAdmin.from('leads').select('notes').eq('id', leadId).single();
      const currentNotes = lead?.notes || '';
      const updatedNotes = currentNotes + activityNote;

      await supabaseAdmin.from('leads').update({ notes: updatedNotes }).eq('id', leadId);
    }

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      amount: amount
    });
  } catch (error) {
    console.error('Stripe Create Invoice Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe invoice.' });
  }
}
