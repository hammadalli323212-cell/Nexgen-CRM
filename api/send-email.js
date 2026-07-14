import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const minify = (html) => html.replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customerEmail, customerName, bookingLink, isChangeOrder, senderId } = req.body;

    if (!customerEmail || !bookingLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Fetch the sender's SMTP credentials
    let smtpUser = 'henry.ortiz@nexgenautotransport.com';
    let smtpPass = process.env.SMTP_PASSWORD;
    let fromName = 'NexGen Auto Transport';

    if (senderId) {
      const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, smtp_password')
        .eq('id', senderId)
        .single();
      
      if (profile && profile.email && profile.smtp_password) {
        smtpUser = profile.email;
        smtpPass = profile.smtp_password;
        fromName = profile.full_name || 'NexGen Auto Transport';
      }
    }

    const hostHeader = req.headers.host || '';
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    const rawBaseUrl = process.env.VITE_APP_URL || `${protocol}://${hostHeader}`;
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    
    // Instead of CID, reference the static public image deployed by Vercel
    const logoUrl = `${baseUrl}/logo-dark.png`;

    const html = minify(`
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#1e3a5f,#0d2137);padding:28px;text-align:center">
<img src="${logoUrl}" alt="NexGen" style="max-width:200px;height:auto;display:block;margin:0 auto 8px"/>
<p style="color:#93c5fd;margin:0;font-size:12px;letter-spacing:2px">RELIABLE · AFFORDABLE · NATIONWIDE</p>
</div>
<div style="padding:28px">
<h2 style="color:#1e3a5f;margin:0 0 14px;font-size:20px">${isChangeOrder ? 'Important: Order Updates' : 'Complete Your Order'}</h2>
<p style="color:#4b5563;margin:0 0 8px;font-size:14px;line-height:1.6">Hi <strong>${customerName || 'Customer'}</strong>,</p>
<p style="color:#4b5563;margin:0 0 20px;font-size:14px;line-height:1.6">${isChangeOrder ? 'There has been a change made to your order with NexGen Auto Transport. Please review the updated details and sign the Change Order form by clicking below:' : 'Thank you for choosing NexGen Auto Transport! Please review and sign your order form by clicking below:'}</p>
<div style="text-align:center;margin:24px 0">
<a href="${bookingLink}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;padding:12px 36px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">${isChangeOrder ? 'Review Change Order' : 'View Order Form'}</a>
</div>
<p style="color:#6b7280;font-size:12px;margin:0 0 6px">If the button doesn't work, copy this link:</p>
<p style="word-break:break-all;color:#3b82f6;font-size:12px;margin:0 0 20px">${bookingLink}</p>
<p style="color:#374151;margin:0">Best regards,</p>
<p style="color:#374151;margin:4px 0 0"><strong>${fromName}</strong><br/>NexGen Auto Transport</p>
</div>
<div style="background:#1e3a5f;padding:20px 28px;text-align:center">
<p style="color:#93c5fd;margin:0 0 4px;font-size:13px;font-weight:600">NexGen Auto Transport</p>
<p style="color:rgba(255,255,255,0.5);margin:0;font-size:11px">Professional Vehicle Shipping Solutions</p>
</div>
</div>
    `);

    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: customerEmail,
      subject: isChangeOrder ? "Updated Change Order - NexGen Auto Transport" : "Complete Your NexGen Auto Transport Order",
      html: html
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
}
