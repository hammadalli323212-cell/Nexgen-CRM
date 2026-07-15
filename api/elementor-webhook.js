import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Elementor sends POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- 1. Security Check ---
    // Check for the custom header we will configure in Elementor
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.query.key;
    const EXPECTED_KEY = process.env.WEBHOOK_SECRET_KEY || 'NEXGEN_SECURE_123!'; 

    if (apiKey !== EXPECTED_KEY) {
      console.warn('Unauthorized webhook attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // --- 2. Extract Payload ---
    // Elementor sends data as either JSON or URL-encoded form data.
    // If it's URL-encoded, Elementor sometimes nests it in 'fields'.
    let data = req.body;
    
    if (data && data.fields) {
       data = data.fields; // Extract from Elementor's nested 'fields' object if present
    }

    // Helper to find a field regardless of exact casing
    const getField = (keysArray) => {
       for (const key of keysArray) {
         if (data[key] !== undefined) return data[key];
         // Check lowercase versions just in case
         const foundKey = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase());
         if (foundKey) return data[foundKey];
       }
       return '';
    };

    const originZip = getField(['origin_zip', 'Origin Zip Code', 'originZip']);
    const destZip = getField(['dest_zip', 'Destination Zip Code', 'destZip']);
    const transportType = getField(['transport_type', 'Transport Type', 'transportType']) || 'Open';
    const vehicleType = getField(['vehicle_type', 'Select Vehicle Type', 'vehicleType']) || 'Car';
    const vehicleMake = getField(['make', 'Vehicle Make', 'vehicleMake']);
    const vehicleYear = getField(['year', 'Vehicle Model Year', 'vehicleYear']);
    const vehicleModel = getField(['model', 'Vehicle Model', 'vehicleModel']);
    const conditionStr = getField(['condition', 'Vehicle Condition', 'vehicleCondition']) || 'Operable';
    const nameStr = getField(['name', 'Name']);
    const emailStr = getField(['email', 'Email']);
    const phoneStr = getField(['phone', 'Phone', 'Phone (10 digits)']);
    const shipDateRaw = getField(['date', 'Ship Date', 'shipDate']);
    const notesStr = getField(['comments', 'Comment From Shipper', 'notes']);

    if (!emailStr || !nameStr) {
      return res.status(400).json({ error: 'Missing required fields: Name and Email' });
    }

    // Split name
    const nameParts = nameStr.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    // --- 3. Zip Code Lookup ---
    const getCityState = async (zip) => {
      if (!zip) return '';
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!response.ok) return '';
        const zipData = await response.json();
        const place = zipData.places[0];
        return `${place['place name']}, ${place['state abbreviation']}`;
      } catch (err) {
        return '';
      }
    };

    const originCity = await getCityState(originZip);
    const destCity = await getCityState(destZip);

    // --- 4. Database Insertion ---
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Database configuration missing.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 4a. Customer
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

    // 4b. Lead
    const leadPayload = {
      customer_id: customerId,
      source: 'Website Form',
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

    // 4c. Vehicle
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
