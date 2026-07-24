import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { leadId, leadNumber, cardNumber, cardExpMonth, cardExpYear, cardCvc, cardName, billingZip, customerEmail } = req.body;

    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvc) {
      return res.status(400).json({ error: 'Missing credit card information.' });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_51PxTEST_SANDBOX_KEY';
    const stripe = new Stripe(stripeSecret);

    // 1. Create or retrieve Stripe Customer
    let customerId;
    if (customerEmail && customerEmail.includes('@')) {
      const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: customerEmail,
          name: cardName,
          metadata: { lead_id: leadId, lead_number: leadNumber }
        });
        customerId = newCustomer.id;
      }
    } else {
      const newCustomer = await stripe.customers.create({
        name: cardName,
        metadata: { lead_id: leadId, lead_number: leadNumber }
      });
      customerId = newCustomer.id;
    }

    // 2. Create PaymentMethod in Stripe (Tokenize Card)
    const cleanCardNum = cardNumber.replace(/\s+/g, '');
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cleanCardNum,
        exp_month: parseInt(cardExpMonth, 10),
        exp_year: parseInt(cardExpYear, 10),
        cvc: cardCvc,
        billing_details: {
          name: cardName,
          address: { postal_code: billingZip }
        }
      }
    });

    // 3. Attach PaymentMethod to Customer in Stripe Vault
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });

    // Set as default payment method for customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod.id }
    });

    const cardBrand = paymentMethod.card?.brand?.toUpperCase() || 'CARD';
    const last4 = paymentMethod.card?.last4 || cleanCardNum.slice(-4);
    const cardSummary = `${cardBrand} **** ${last4}`;
    const paymentMethodId = paymentMethod.id;

    // 4. Update Database safely with Token & Card Summary (NO RAW CARD NUMBER STORED)
    if (leadId) {
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const timestamp = new Date().toLocaleString();
      const cardTag = `\n[STRIPE_CARD_SAVED: ${cardSummary} | ${paymentMethodId} | ${customerId}]`;
      const activityNote = `\n[${timestamp}] Customer Saved Card on File: ${cardSummary} (Stripe Vault Token: ${paymentMethodId})`;

      const { data: lead } = await supabaseAdmin.from('leads').select('notes, customer_id').eq('id', leadId).single();
      const currentNotes = lead?.notes || '';
      const updatedNotes = currentNotes + cardTag + activityNote;

      await supabaseAdmin.from('leads').update({
        notes: updatedNotes,
        payment_method: `Saved Card (${cardSummary})`
      }).eq('id', leadId);

      // Save Stripe Customer ID to customer record if exists
      if (lead?.customer_id) {
        await supabaseAdmin.from('customers').update({
          stripe_customer_id: customerId
        }).eq('id', lead.customer_id);
      }
    }

    return res.status(200).json({
      success: true,
      cardSummary: cardSummary,
      paymentMethodId: paymentMethodId,
      customerId: customerId
    });
  } catch (error) {
    console.error('Stripe Save Card Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save card in Stripe.' });
  }
}
