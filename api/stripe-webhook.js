import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_51PxTEST_SANDBOX_KEY';
  const stripe = new Stripe(stripeSecret);

  let event;

  try {
    // If webhook secret is configured, verify signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && req.headers['stripe-signature']) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Fallback for development/testing
      event = req.body;
    }
  } catch (err) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Handle payment completion events
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const sessionOrIntent = event.data.object;
      const metadata = sessionOrIntent.metadata || {};
      const leadId = metadata.lead_id;
      const amountTotal = (sessionOrIntent.amount_total || sessionOrIntent.amount || 0) / 100;

      if (leadId && amountTotal > 0) {
        const timestamp = new Date().toLocaleString();
        const activityNote = `\n[${timestamp}] Online Stripe Payment Received: $${amountTotal.toFixed(2)} (${event.type})`;

        const { data: lead } = await supabaseAdmin.from('leads').select('notes, deposit_amount').eq('id', leadId).single();
        if (lead) {
          const currentNotes = lead.notes || '';
          const newDeposit = (parseFloat(lead.deposit_amount || 0) + amountTotal).toFixed(2);

          await supabaseAdmin.from('leads').update({
            deposit_amount: newDeposit,
            broker_fee_collected: true,
            payment_method: 'Credit Card (Stripe Online)',
            notes: currentNotes + activityNote
          }).eq('id', leadId);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe Webhook Handler Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
