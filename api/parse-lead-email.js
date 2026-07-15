import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let emailBody = '';
    
    // Make.com sends it as raw text/plain, so req.body is literally the string
    if (typeof req.body === 'string') {
      emailBody = req.body;
    } else if (req.body && req.body.emailBody) {
      emailBody = req.body.emailBody;
    }

    if (!emailBody) {
      return res.status(400).json({ error: 'Missing email content in payload' });
    }

    // --- 1. Regex Extraction ---
    // Handle possible variations in newlines/spaces
    const extract = (pattern) => {
      const match = emailBody.match(pattern);
      return match ? match[1].trim() : null;
    };

    const originZip = extract(/Origin Zip Code:\s*(\d{5})/i) || '';
    const destZip = extract(/Destination Zip Code:\s*(\d{5})/i) || '';
    const transportType = extract(/Transport Type\s*:\s*(.*)/i) || 'Open';
    const vehicleType = extract(/Select Vehicle Type:\s*(.*)/i) || 'Car';
    const vehicleMake = extract(/Vehicle Make:\s*(.*)/i) || '';
    const vehicleYear = extract(/Vehicle Model Year:\s*(\d{4})/i) || '';
    const vehicleModel = extract(/Vehicle Model:\s*(.*)/i) || '';
    const conditionStr = extract(/Vehicle Condition:\s*(.*)/i) || 'Operable';
    const nameStr = extract(/Name:\s*(.*)/i) || '';
    const emailStr = extract(/Email:\s*(.*)/i) || '';
    const phoneStr = extract(/Phone.*:\s*(.*)/i) || '';
    const shipDateRaw = extract(/Ship Date.*:\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i) || '';
    const notesStr = extract(/Comment From Shipper:([\s\S]*?)---/i) || '';

    if (!emailStr || !nameStr) {
      return res.status(400).json({ error: 'Could not extract minimum required fields (Name or Email)' });
    }

    // Split name
    const nameParts = nameStr.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // --- 2. Zip Code Lookup ---
    const getCityState = async (zip) => {
      if (!zip) return '';
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!response.ok) return '';
        const data = await response.json();
        const place = data.places[0];
        return `${place['place name']}, ${place['state abbreviation']}`;
      } catch (err) {
        return '';
      }
    };

    const originCity = await getCityState(originZip);
    const destCity = await getCityState(destZip);

    // --- 3. Database Insertion ---
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Database configuration missing.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3a. Customer
    let customerId = null;
    const { data: existingCustomer } = await supabaseAdmin.from('customers').select('id').eq('email', emailStr).single();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          email: emailStr,
          phone: phoneStr
        }])
        .select()
        .single();
      
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    // 3b. Lead
    const leadPayload = {
      customer_id: customerId,
      source: 'Website Email',
      origin_zip: originZip,
      origin_city: originCity,
      destination_zip: destZip,
      destination_city: destCity,
      ship_date: shipDateRaw || null,
      status: 'New',
      notes: notesStr.trim(),
    };

    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert([leadPayload])
      .select()
      .single();

    if (leadError) throw leadError;
    const leadId = leadData.id;

    // 3c. Vehicle
    const { error: vehicleError } = await supabaseAdmin
      .from('lead_vehicles')
      .insert([{
        lead_id: leadId,
        vehicle_year: vehicleYear,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_type: vehicleType,
        condition: conditionStr.includes('Inop') ? 'Inoperable' : 'Operable',
        trailer_type: transportType.includes('Enclosed') ? 'Enclosed' : 'Open'
      }]);

    if (vehicleError) throw vehicleError;

    return res.status(200).json({ success: true, lead_id: leadId, lead_number: leadData.lead_number });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
