import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { leadId, leadNumber, amount, paymentMethodId, customerEmail, customerName, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid charge amount.' });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_51PxTEST_SANDBOX_KEY';
    const stripe = new Stripe(stripeSecret);

    let paymentIntent;

    if (paymentMethodId) {
      // Direct Charge using provided PaymentMethod (Stripe Elements or Saved Card)
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        description: description || `Deposit Payment for NG-${leadNumber}`,
        receipt_email: customerEmail && customerEmail.includes('@') ? customerEmail : undefined,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          lead_id: leadId,
          lead_number: leadNumber
        }
      });
    } else {
      // Fallback: Create PaymentIntent for Client-side confirmation
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: 'usd',
        description: description || `Deposit Payment for NG-${leadNumber}`,
        metadata: {
          lead_id: leadId,
          lead_number: leadNumber
        }
      });
    }

    const isSucceeded = paymentIntent.status === 'succeeded';

    // Update database record if payment succeeded
    if (leadId && isSucceeded) {
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const timestamp = new Date().toLocaleString();
      const activityNote = `\n[${timestamp}] Stripe Card Charge Successful: $${amount} (PaymentIntent: ${paymentIntent.id})`;

      const { data: lead } = await supabaseAdmin.from('leads').select('notes, deposit_amount').eq('id', leadId).single();
      const currentNotes = lead?.notes || '';
      const newDeposit = (parseFloat(lead?.deposit_amount || 0) + parseFloat(amount)).toFixed(2);

      await supabaseAdmin.from('leads').update({
        deposit_amount: newDeposit,
        broker_fee_collected: true,
        payment_method: 'Credit Card (Stripe)',
        notes: currentNotes + activityNote
      }).eq('id', leadId);
    }

    return res.status(200).json({
      success: isSucceeded,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount
    });
  } catch (error) {
    console.error('Stripe Charge Error:', error);
    return res.status(500).json({ error: error.message || 'Stripe card charge failed.' });
  }
}
