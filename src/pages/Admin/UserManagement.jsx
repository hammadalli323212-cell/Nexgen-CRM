import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Shield, Mail, UserPlus, CheckCircle } from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'user'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to invite user');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      setInviteSuccess(`Successfully sent invite to ${formData.email}`);
      setFormData({ fullName: '', email: '', role: 'user' });
      fetchUsers(); // Refresh list
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>User Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Invite users and manage roles.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        
        {/* Users List */}
        <div style={{ backgroundColor: 'var(--panel-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} /> Team Members ({users.length})
          </h2>
          
          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading users...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{u.first_name} {u.last_name} {u.id === currentUser?.id && '(You)'}</div>
                  </div>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem', 
                    backgroundColor: u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: u.role === 'admin' ? '#fbbf24' : '#60a5fa'
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Form */}
        <div style={{ backgroundColor: 'var(--panel-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} /> Invite New User
          </h2>
          
          {inviteSuccess && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} /> {inviteSuccess}
            </div>
          )}

          {inviteError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Full Name</label>
              <input 
                type="text" 
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              >
                <option value="user">User (Standard Access)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isInviting}
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--brand-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: isInviting ? 'not-allowed' : 'pointer', opacity: isInviting ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Mail size={16} /> {isInviting ? 'Sending Invite...' : 'Send Email Invite'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default UserManagement;
