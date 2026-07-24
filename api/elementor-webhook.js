import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Elementor sends POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- 1. Security Check ---
    // TEMPORARILY DISABLED FOR DEBUGGING
    /*
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.query.key;
    const EXPECTED_KEY = process.env.WEBHOOK_SECRET_KEY || 'NEXGEN_SECURE_123!'; 

    if (apiKey !== EXPECTED_KEY) {
      console.warn('Unauthorized webhook attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    */

    // --- 2. Extract Payload ---
    // Elementor sends data as either JSON or URL-encoded form data.
    // If it's URL-encoded, Elementor sometimes nests it in 'fields'.
    let data = req.body || {};
    
    if (data && data.fields) {
       data = data.fields; 
    }

    // Helper to find a field regardless of exact casing
    const getField = (keysArray) => {
       if (!data || typeof data !== 'object') return '';
       for (const key of keysArray) {
         if (data[key] !== undefined) return data[key];
         // Check lowercase versions just in case
         const foundKey = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase());
         if (foundKey) return data[foundKey];
       }
       return '';
    };

    const originZip = getField(['origin_zip', 'Origin Zip Code', 'originZip', 'Pick-up']);
    const destZip = getField(['dest_zip', 'Destination Zip Code', 'destZip', 'Delivery']);
    const transportType = getField(['transport_type', 'Transport Type', 'transportType']) || 'Open';
    const vehicleType = getField(['vehicle_type', 'Select Vehicle Type', 'vehicleType', 'Vehicle Type']) || 'Car';
    const vehicleMake = getField(['make', 'Vehicle Make', 'vehicleMake']);
    const vehicleYear = getField(['year', 'Vehicle Model Year', 'vehicleYear', 'Year']);
    const vehicleModel = getField(['model', 'Vehicle Model', 'vehicleModel']);
    const conditionStr = getField(['condition', 'Vehicle Condition', 'vehicleCondition', 'Condition']) || 'Operable';
    const nameStr = (getField(['name', 'Name', 'Full Name', 'first_name', 'last_name', 'Customer Name']) || '').toString();
    const emailStr = (getField(['email', 'Email', 'Email Address']) || '').toString();
    const phoneRaw = (getField(['phone', 'Phone', 'Phone Number', 'Phone (10 digits)', 'customer_phone', 'telephone', 'mobile']) || '').toString();
    const shipDateRaw = (getField(['date', 'Ship Date', 'shipDate', 'Estimated Ship Date', 'pickup_date', 'Pickup Date', 'First Available Pick-up Date']) || '').toString();
    const notesStr = (getField(['comments', 'Comment From Shipper', 'notes', 'Additional Notes', 'additional_notes']) || '').toString();
    const honeypotVal = (getField(['honeypot', 'form_fields[honeypot]', 'hp', 'website_hp']) || '').toString();

    // --- 2.1 Anti-Spam Validation Filter ---
    if (honeypotVal) {
      console.warn(`[Spam Blocked] Honeypot field filled: "${honeypotVal}"`);
      return res.status(200).json({ success: true, message: 'Submission received and filtered.' });
    }

    const combinedContent = `${nameStr} ${notesStr} ${vehicleMake} ${vehicleModel}`.toLowerCase();
    
    // Rule 1: Cyrillic / Russian script detection
    const containsCyrillic = /[\u0400-\u04FF]/.test(combinedContent);
    // Rule 2: Domain extension / URLs in Name field (only if nameStr is provided)
    const containsDomainInName = nameStr ? /(\.com|\.net|\.org|\.ru|\.site|http:\/\/|https:\/\/)/i.test(nameStr) : false;
    // Rule 3: Common spam keywords
    const containsSpamKeywords = /(казино|аренда виллы|квартиру|slot|casino|crypto|telegram)/i.test(combinedContent);

    if (containsCyrillic || containsDomainInName || containsSpamKeywords) {
      console.warn(`[Spam Blocked] Filtered submission from "${nameStr}" (${emailStr}): Cyrillic=${containsCyrillic}, Domain=${containsDomainInName}`);
      return res.status(200).json({ success: true, message: 'Submission received and filtered.' });
    }

    // Auto-format phone
    const formatPhone = (val) => {
      if (!val) return val;
      const digits = val.replace(/\D/g, '');
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    };
    const phoneStr = formatPhone(phoneRaw);

    // Split name safely
    const cleanName = nameStr.trim();
    const nameParts = cleanName ? cleanName.split(/\s+/) : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (firstName ? 'Unknown' : '');

    // --- 3. Parallel Zip Code Lookup with Timeout ---
    const getCityState = async (zip) => {
      if (!zip || zip.length < 5) return '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const response = await fetch(`https://api.zippopotam.us/us/${zip.slice(0, 5)}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return '';
        const zipData = await response.json();
        const place = zipData.places[0];
        return `${place['place name']}, ${place['state abbreviation']}`;
      } catch (err) {
        return '';
      }
    };

    const [originCity, destCity] = await Promise.all([
      getCityState(originZip),
      getCityState(destZip)
    ]);

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
    
    if (emailStr) {
      const { data: matches } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name, phone')
        .ilike('email', emailStr);

      if (matches && matches.length > 0) {
        const exactMatch = matches.find(m => 
          (m.phone || '') === (phoneStr || '') &&
          (m.first_name || '').toLowerCase() === (firstName || '').toLowerCase() &&
          (m.last_name || '').toLowerCase() === (lastName || '').toLowerCase()
        );
        if (exactMatch) {
          customerId = exactMatch.id;
        }
      }
    }
    
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert([{
          first_name: firstName || 'Website',
          last_name: lastName || 'Lead',
          email: emailStr || `lead-${Date.now()}@nexgen.com`,
          phone: phoneStr
        }])
        .select()
        .single();
      
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    // 4b. Lead
    const cleanNotes = notesStr.trim();
    const finalNotes = cleanNotes ? `===SHIPPER_NOTE===\n${cleanNotes}\n===INTERNAL_MEMO===\n` : `===INTERNAL_MEMO===\n`;

    const leadPayload = {
      customer_id: customerId,
      source: 'Website Form',
      origin_zip: originZip,
      origin_city: originCity ? originCity.split(', ')[0] : '',
      origin_state: originCity ? originCity.split(', ')[1] : '',
      destination_zip: destZip,
      destination_city: destCity ? destCity.split(', ')[0] : '',
      destination_state: destCity ? destCity.split(', ')[1] : '',
      ship_date: shipDateRaw || null,
      status: 'New',
      notes: finalNotes,
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
        vehicle_year: vehicleYear || '',
        vehicle_make: vehicleMake || '',
        vehicle_model: vehicleModel || '',
        vehicle_type: vehicleType || 'Car',
        condition: (conditionStr || '').includes('Inop') ? 'Inoperable' : 'Operable',
        trailer_type: (transportType || '').includes('Enclosed') ? 'Enclosed' : 'Open'
      }]);

    if (vehicleError) throw vehicleError;

    return res.status(200).json({ success: true, lead_id: leadId, lead_number: leadData.lead_number });

  } catch (error) {
    console.error('Webhook Error:', error);
    
    // Attempt to log the error to the database so we can see it!
    try {
      const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      await supabaseAdmin.from('leads').insert([{
        source: 'Website Form',
        status: 'New',
        notes: 'CRITICAL WEBHOOK ERROR:\n' + error.message + '\n\nPayload:\n' + JSON.stringify(req.body)
      }]);
    } catch (dbError) {
      // Ignore
    }

    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
