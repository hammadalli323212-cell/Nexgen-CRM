import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './BookingAuth.module.css';

const BookingAuth = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    const loadCustomerData = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('customers (email, phone)')
        .eq('lead_number', id)
        .single();
        
      if (data && data.customers) {
        setCustomerData(data.customers);
        
        // Mask Email (e.g. j***n@gmail.com)
        const email = data.customers.email || '';
        if (email.includes('@')) {
          const [name, domain] = email.split('@');
          const maskedName = name.length > 2 
            ? `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`
            : name;
          setMaskedEmail(`${maskedName}@${domain}`);
        }

        // Mask Phone (e.g. ******1234)
        const phone = data.customers.phone || '';
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 4) {
          setMaskedPhone(`******${cleanPhone.slice(-4)}`);
        }
      }
    };
    loadCustomerData();
  }, [id]);

  const handleValidate = async () => {
    if (!emailInput && !phoneInput) {
      setError('Please enter either an email or phone number.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Fetch the lead and customer based on lead_number
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select(`
          id,
          customers (email, phone)
        `)
        .eq('lead_number', id)
        .single();

      if (fetchError || !data) {
        setError('Invalid tracking link.');
        return;
      }

      const customerEmail = data.customers.email || '';
      const customerPhone = data.customers.phone || '';

      // Normalize inputs for comparison
      const cleanEmailInput = emailInput.toLowerCase().trim();
      const cleanCustomerEmail = customerEmail.toLowerCase().trim();
      
      const cleanPhoneInput = phoneInput.replace(/\D/g, '');
      const cleanCustomerPhone = customerPhone.replace(/\D/g, '');

      let isValid = false;

      // Check if they entered email and it matches
      if (emailInput && cleanCustomerEmail !== '') {
        if (cleanEmailInput === cleanCustomerEmail) {
          isValid = true;
        }
      } 
      
      // Check if they entered phone and it matches
      if (phoneInput && cleanCustomerPhone !== '') {
        // Compare the last 10 digits to ignore country codes like +1
        const phoneInput10 = cleanPhoneInput.slice(-10);
        const customerPhone10 = cleanCustomerPhone.slice(-10);
        
        if (phoneInput10.length >= 7 && phoneInput10 === customerPhone10) {
          isValid = true;
        }
      }

      if (isValid) {
        // Validation success. We can store a simple flag in sessionStorage to allow access to the wizard
        sessionStorage.setItem(`booking_auth_${id}`, 'true');
        navigate(`/booking/${id}/wizard`);
      } else {
        setError('The information provided does not match our records for this order.');
      }

    } catch (err) {
      console.error(err);
      setError('An error occurred during validation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h1 className={styles.title}>Confirm your identity</h1>
        
        <div className={styles.formGroup}>
          <label>Enter email address that matches this pattern: {maskedEmail || '***@***.com'}</label>
          <input 
            type="text" 
            className={styles.input} 
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email Address"
          />
        </div>

        <div className={styles.orText}>Or, enter phone number which ends in {maskedPhone || '******0000'}</div>
        
        <div className={styles.formGroup} style={{ marginTop: '-15px' }}>
          <input 
            type="tel" 
            className={styles.input} 
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Phone Number"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button 
          className={styles.submitBtn} 
          onClick={handleValidate}
          disabled={isLoading}
        >
          {isLoading ? 'Validating...' : 'Validate and Continue'}
        </button>
      </div>
    </div>
  );
};

export default BookingAuth;
