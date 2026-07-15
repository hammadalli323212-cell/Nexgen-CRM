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
    const { customerEmail, customerName, leadData, bookingLink, senderId } = req.body;
    if (!customerEmail) {
      return res.status(400).json({ error: 'Missing customerEmail' });
    }

    // 1. Fetch the sender's SMTP credentials
    let smtpUser = 'henry.ortiz@nexgenautotransport.com';
    let smtpPass = process.env.SMTP_PASSWORD;
    let fromName = 'NexGen Auto Transport';

    let profileHasPassword = false;

    if (senderId) {
      const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, smtp_password')
        .eq('id', senderId)
        .single();
      
      if (profile && profile.email) {
        smtpUser = profile.email;
        fromName = profile.full_name || 'NexGen Auto Transport';
        if (profile.smtp_password) {
          smtpPass = profile.smtp_password;
          profileHasPassword = true;
        }
      }
    }

    // Fallback to Resend if they don't have a personal SMTP password saved
    let smtpHost = 'smtp.hostinger.com';
    if (!profileHasPassword) {
      smtpHost = 'smtp.resend.com';
      smtpUser = 'resend';
      smtpPass = process.env.RESEND_API_KEY;
    }

    const hostHeader = req.headers.host || '';
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    const rawBaseUrl = process.env.VITE_APP_URL || `${protocol}://${hostHeader}`;
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    
    // Instead of CID, reference the static public image deployed by Vercel
    const logoUrl = `${baseUrl}/logo-dark.jpg`;

    const vehicles = leadData.vehicles || [];
    const vRows = vehicles.map(v =>
      `<tr><td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${v.vehicle_year||''} ${v.vehicle_make||''} ${v.vehicle_model||''}</td><td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${v.condition||'Running'}</td><td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${v.trailer_type||'Open'}</td></tr>`
    ).join('');

    const html = minify(`
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#1e3a5f,#0d2137);padding:28px;text-align:center">
<img src="${logoUrl}" alt="NexGen" style="max-width:200px;height:auto;display:block;margin:0 auto 8px"/>
<p style="color:#93c5fd;margin:0;font-size:12px;letter-spacing:2px">RELIABLE · AFFORDABLE · NATIONWIDE</p>
</div>
<div style="padding:28px">
<h2 style="color:#1e3a5f;margin:0 0 14px;font-size:20px">Your Auto Transport Quote</h2>
<p style="color:#4b5563;margin:0 0 8px;font-size:14px;line-height:1.6">Hi <strong>${customerName || 'Customer'}</strong>,</p>
<p style="color:#4b5563;margin:0 0 20px;font-size:14px;line-height:1.6">Thank you for requesting a quote from NexGen Auto Transport! Here are the details for your upcoming shipment:</p>

<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 24px">
<table style="width:100%;border-collapse:collapse">
<tr>
<td style="padding:0 0 12px;vertical-align:top">
<p style="margin:0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px">📍 Origin</p>
<p style="margin:4px 0 0;font-size:15px;color:#1e293b;font-weight:600">${leadData.origin_city || ''}${leadData.origin_state ? ', ' + leadData.origin_state : ''} ${leadData.origin_zip || ''}</p>
</td>
<td style="padding:0 0 12px;vertical-align:top">
<p style="margin:0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px">📍 Destination</p>
<p style="margin:4px 0 0;font-size:15px;color:#1e293b;font-weight:600">${leadData.destination_city || ''}${leadData.destination_state ? ', ' + leadData.destination_state : ''} ${leadData.destination_zip || ''}</p>
</td>
</tr>
<tr>
<td style="padding:12px 0 0;border-top:1px solid #e2e8f0;vertical-align:top">
<p style="margin:0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px">📅 Est. Ship Date</p>
<p style="margin:4px 0 0;font-size:15px;color:#1e293b;font-weight:600">${leadData.ship_date ? new Date(leadData.ship_date).toLocaleDateString() : 'TBD'}</p>
</td>
<td style="padding:12px 0 0;border-top:1px solid #e2e8f0;vertical-align:top">
<p style="margin:0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px">💰 Total Price</p>
<p style="margin:4px 0 0;font-size:20px;color:#2563eb;font-weight:800">$${leadData.estimated_price||0}</p>
</td>
</tr>
</table>
</div>

${bookingLink ? `
<div style="text-align:center;margin:0 0 32px">
<a href="${bookingLink}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;box-shadow:0 4px 6px -1px rgba(37,99,235,0.2)">Book Now Securely</a>
</div>
` : ''}

<h3 style="color:#1e293b;margin:0 0 12px;font-size:16px">🚗 Vehicle Details</h3>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
<thead>
<tr style="background:#f9fafb">
<th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Vehicle</th>
<th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Condition</th>
<th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Trailer</th>
</tr>
</thead>
<tbody>
${vRows}
</tbody>
</table>

<h3 style="color:#1e293b;margin:0 0 12px;font-size:16px">🏆 Why Choose NexGen?</h3>
<ul style="margin:0 0 24px;padding:0;list-style:none">
<li style="margin:0 0 8px;font-size:14px;color:#4b5563">✅ <strong>Fully Licensed & Bonded</strong> - FMCSA compliant</li>
<li style="margin:0 0 8px;font-size:14px;color:#4b5563">🔒 <strong>Fully Insured</strong> - Bumper-to-bumper coverage</li>
<li style="margin:0 0 8px;font-size:14px;color:#4b5563">⭐ <strong>Top Rated</strong> - 5-star customer service</li>
</ul>

<div style="background:#f8fafc;padding:16px;border-radius:8px;margin:0 0 24px;text-align:center">
<p style="margin:0 0 4px;font-size:14px;color:#4b5563;font-weight:600">Questions? We're here to help.</p>
<p style="margin:0;font-size:18px;color:#1e3a5f;font-weight:700">📞 (832) 886-1321</p>
</div>

<p style="color:#374151;margin:0">Best regards,</p>
<p style="color:#374151;margin:4px 0 0"><strong>${fromName}</strong><br/>NexGen Auto Transport</p>
</div>

<div style="background:#1e3a5f;padding:20px 28px;text-align:center">
<p style="color:#93c5fd;margin:0 0 4px;font-size:13px;font-weight:600">NexGen Auto Transport</p>
<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">© ${new Date().getFullYear()} NexGen Auto Transport. All rights reserved.</p>
</div>
</div>
<div style="display:none;color:#fff;font-size:1px;">Ref: ${Date.now()}-${Math.random().toString(36).substring(7)}</div>
    `);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const senderEmail = profileHasPassword ? smtpUser : (smtpUser !== 'resend' ? smtpUser : 'info@nexgenautotransport.com');

    const info = await transporter.sendMail({
      from: `"${fromName}" <${senderEmail}>`,
      to: customerEmail,
      subject: "Your NexGen Auto Transport Quote",
      html: html
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
}
