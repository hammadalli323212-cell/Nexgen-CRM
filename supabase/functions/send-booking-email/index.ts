import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerEmail, customerName, bookingLink } = await req.json()

    if (!customerEmail || !bookingLink) {
      throw new Error('Missing required fields: customerEmail or bookingLink')
    }

    const password = Deno.env.get('SMTP_PASSWORD')
    if (!password) {
      throw new Error('Server configuration error: SMTP_PASSWORD is not set')
    }

    const client = new SmtpClient();

    // Hostinger SMTP configuration
    await client.connectTLS({
      hostname: "smtp.hostinger.com",
      port: 465,
      username: "henry.ortiz@nexgenautotransport.com",
      password: password,
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #0056b3;">Complete Your Auto Transport Order</h2>
        <p>Hi ${customerName || 'Customer'},</p>
        <p>Thank you for choosing NexGen Auto Transport! We are ready to move forward with your shipment.</p>
        <p>Please review and sign your order form securely by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${bookingLink}" style="background-color: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Order Form</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${bookingLink}</p>
        <p>If you have any questions, feel free to reply to this email or call us directly.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Henry Ortiz</strong><br/>NexGen Auto Transport</p>
      </div>
    `;

    await client.send({
      from: "henry.ortiz@nexgenautotransport.com",
      to: customerEmail,
      subject: "Complete Your NexGen Auto Transport Order",
      content: "Please view your order form using the secure link: " + bookingLink,
      html: htmlContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
