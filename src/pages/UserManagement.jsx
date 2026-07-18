import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { TENANT } from '../config/tenant';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, Trash2, Lock } from 'lucide-react';

const UserManagement = () => {
  const { user, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); // null means creating new user
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    smtp_password: '',
    phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, smtp_password, phone')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = editingUserId ? '/api/update-user' : '/api/create-user';
      const bodyData = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        smtp_password: formData.smtp_password,
        phone: formData.phone
      };
      
      if (editingUserId) {
        bodyData.id = editingUserId;
        // Only send password if it's not empty when updating
        if (formData.password) {
          bodyData.password = formData.password;
        }
      } else {
        bodyData.password = formData.password;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editingUserId ? 'update' : 'create'} user`);
      }

      toast.success(`User ${editingUserId ? 'updated' : 'created'} successfully!`);
      setIsModalOpen(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', password: '', role: 'user', smtp_password: '', phone: '' });
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setEditingUserId(u.id);
    setFormData({
      name: u.full_name || '',
      email: u.email || '',
      password: '', // Empty password field so they only enter if they want to change it
      role: u.role || 'user',
      smtp_password: u.smtp_password || '',
      phone: u.phone || ''
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'user', smtp_password: '', phone: '' });
    setIsModalOpen(true);
  };

  const confirmDelete = (u) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ id: userToDelete.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      toast.success('User deleted successfully!');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
        <h2>Access Denied</h2>
        <p>You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>User Management</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage team members and roles.</p>
        </div>
        <button 
          onClick={openCreateModal}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'var(--brand-blue)', color: '#fff', border: 'none',
            padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div style={{ backgroundColor: 'var(--bg-panel)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>USER NAME</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>USER EMAIL</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>PHONE</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>USER ROLE</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>JOINED</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Loading users...</td></tr>
            ) : usersList.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No users found.</td></tr>
            ) : (
              usersList.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.full_name || u.email?.split('@')[0] || 'Unknown'}</div>
                  </td>
                  <td style={{ padding: '15px' }}>{u.email}</td>
                  <td style={{ padding: '15px' }}>{u.phone || '-'}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: u.role === 'admin' ? 'rgba(0, 123, 255, 0.2)' : 'rgba(108, 117, 125, 0.2)',
                      color: u.role === 'admin' ? '#66b2ff' : '#adb5bd'
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    {u.email === TENANT.ADMIN_EMAIL ? (
                      <div title="System Admin cannot be modified" style={{ display: 'inline-flex', padding: '8px', opacity: 0.5 }}>
                        <Lock size={18} />
                      </div>
                    ) : (
                      <>
                        <button onClick={() => openEditModal(u)} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', marginRight: '15px' }} title="Edit User">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => confirmDelete(u)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete User">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{editingUserId ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="(832) 886-1321"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{editingUserId ? 'New Password (Leave blank to keep)' : 'Password (Min 6 chars)'}</label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUserId}
                  minLength="6"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hostinger Email Password</label>
                <input 
                  type="password" 
                  value={formData.smtp_password}
                  onChange={e => setFormData({...formData, smtp_password: e.target.value})}
                  placeholder="Only enter if they will send emails"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required for this user to send quotes/orders from their own email.</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: 'var(--brand-blue)', border: 'none', color: '#fff', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Saving...' : (editingUserId ? 'Save Changes' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: '0 0 15px', color: 'var(--text-primary)' }}>Delete User</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleDeleteUser} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
