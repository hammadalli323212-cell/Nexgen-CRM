import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have a session to set the password for
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If no session after clicking the invite link, something is wrong
      if (!session && !location.hash) {
        setError("Invalid or expired invite link.");
      }
    };
    checkSession();
  }, [location]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-dark)' }}>
        <div style={{ backgroundColor: 'var(--bg-panel)', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '16px' }}>Password Set Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <div style={{ backgroundColor: 'var(--bg-panel)', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px', textAlign: 'center' }}>Set Your Password</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          Welcome! Please set a password for your account to continue.
        </p>
        
        {error && (
          <div style={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem' }}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ width: '100%', padding: '12px', backgroundColor: 'var(--brand-blue)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
