import toast from 'react-hot-toast';
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Edit2 } from 'lucide-react';
import styles from './Leads.module.css'; // Reusing layouts
import modalStyles from '../components/common/CommandPalette.module.css'; // Reusing modal overlay

const columnHelper = createColumnHelper();

const Carriers = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCarrierId, setEditingCarrierId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    company_name: '', mc_number: '', dot_number: '', insurance_status: 'Pending', rating: 5.0, available_trucks: 1, preferred_routes: '',
    company_phone: '', dispatch_phone: '', driver_phone: '', out_of: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const formatPhone = (val) => {
    if (!val) return val;
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const fetchCarriers = async () => {
    try {
      const { data, error } = await supabase.from('carriers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCarriers(data);
    } catch (err) {
      console.error('Error fetching carriers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCarrierId(null);
    setFormData({ company_name: '', mc_number: '', dot_number: '', insurance_status: 'Pending', rating: 5.0, available_trucks: 1, preferred_routes: '', company_phone: '', dispatch_phone: '', driver_phone: '', out_of: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (carrier, e) => {
    e?.stopPropagation();
    setEditingCarrierId(carrier.id);
    setFormData({
      company_name: carrier.company_name || '',
      mc_number: carrier.mc_number || '',
      dot_number: carrier.dot_number || '',
      company_phone: carrier.company_phone || '',
      dispatch_phone: carrier.dispatch_phone || '',
      driver_phone: carrier.driver_phone || '',
      out_of: carrier.out_of || '',
      insurance_status: carrier.insurance_status || 'Pending',
      rating: carrier.rating ?? 5.0,
      available_trucks: carrier.available_trucks ?? 1,
      preferred_routes: carrier.preferred_routes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingCarrierId) {
        const { error } = await supabase.from('carriers').update(formData).eq('id', editingCarrierId);
        if (error) throw error;
        toast.success('Carrier updated successfully!');
      } else {
        const { error } = await supabase.from('carriers').insert([formData]);
        if (error) throw error;
        toast.success('Carrier added successfully!');
      }
      
      setIsModalOpen(false);
      setEditingCarrierId(null);
      setFormData({ company_name: '', mc_number: '', dot_number: '', insurance_status: 'Pending', rating: 5.0, available_trucks: 1, preferred_routes: '', company_phone: '', dispatch_phone: '', driver_phone: '', out_of: '' });
      fetchCarriers();
    } catch (err) {
      toast.error('Error saving carrier: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo(
    () => {
      const cols = [
        columnHelper.accessor('company_name', { 
          header: 'Carrier Name',
          cell: info => (
            <Link to={`/carriers/${info.row.original.id}`} className={styles.tableLink}>
              {info.getValue()}
            </Link>
          )
        }),
        columnHelper.accessor('out_of', { header: 'Out Of', cell: info => info.getValue() || '-' }),
        columnHelper.accessor('company_phone', { header: 'Company Phone', cell: info => info.getValue() || '-' }),
        columnHelper.accessor('dispatch_phone', { header: 'Dispatch Phone', cell: info => info.getValue() || '-' }),
        columnHelper.accessor('driver_phone', { header: 'Driver Phone', cell: info => info.getValue() || '-' }),
        columnHelper.accessor('mc_number', { header: 'MC Number' }),
        columnHelper.accessor('dot_number', { header: 'DOT Number', cell: info => info.getValue() || '-' }),
        columnHelper.accessor('insurance_status', {
          header: 'Insurance',
          cell: info => (
            <span style={{ 
              color: info.getValue() === 'Active' ? '#10b981' : info.getValue() === 'Expired' ? '#ef4444' : '#f59e0b',
              backgroundColor: info.getValue() === 'Active' ? 'rgba(16, 185, 129, 0.1)' : info.getValue() === 'Expired' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem'
            }}>
              {info.getValue()}
            </span>
          )
        }),
        columnHelper.accessor('rating', { header: 'Rating' }),
        columnHelper.accessor('available_trucks', { header: 'Available Trucks' }),
        columnHelper.accessor('preferred_routes', { header: 'Preferred Routes' }),
      ];

      if (isAdmin || isSuperAdmin) {
        cols.push(
          columnHelper.display({
            id: 'actions',
            header: 'Action',
            cell: info => (
              <button 
                onClick={(e) => handleOpenEditModal(info.row.original, e)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--brand-blue)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem'
                }}
              >
                <Edit2 size={13} /> Edit
              </button>
            )
          })
        );
      }

      return cols;
    },
    [isAdmin, isSuperAdmin]
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Carriers</h1>
          <p>Manage your carrier network and compliances.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={handleOpenAddModal}>+ Add Carrier</button>
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading carriers...</div>
        ) : (
          <DataTable columns={columns} data={carriers} />
        )}
      </div>

      {isModalOpen && (
        <div className={modalStyles.overlay} onClick={() => setIsModalOpen(false)}>
          <div className={modalStyles.palette} style={{ padding: '24px', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
              {editingCarrierId ? 'Edit Carrier' : 'Add New Carrier'}
            </h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Carrier Name *</label>
                  <input required type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Out of (City, State)</label>
                  <input type="text" value={formData.out_of} onChange={e => setFormData({...formData, out_of: e.target.value})} placeholder="e.g. Miami, FL" style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Company Phone</label>
                  <input type="text" value={formData.company_phone} onChange={e => setFormData({...formData, company_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Dispatch Phone</label>
                  <input type="text" value={formData.dispatch_phone} onChange={e => setFormData({...formData, dispatch_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Driver Phone</label>
                  <input type="text" value={formData.driver_phone} onChange={e => setFormData({...formData, driver_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>MC Number</label>
                  <input type="text" value={formData.mc_number} onChange={e => setFormData({...formData, mc_number: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>DOT Number</label>
                  <input type="text" value={formData.dot_number} onChange={e => setFormData({...formData, dot_number: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Insurance Status</label>
                  <select value={formData.insurance_status} onChange={e => setFormData({...formData, insurance_status: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Available Trucks</label>
                  <input type="number" value={formData.available_trucks} onChange={e => setFormData({...formData, available_trucks: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Rating (out of 5.0)</label>
                  <input type="number" step="0.1" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Preferred Routes</label>
                <input type="text" placeholder="e.g. East Coast, FL to NY" value={formData.preferred_routes} onChange={e => setFormData({...formData, preferred_routes: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--brand-blue)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  {isSaving ? 'Saving...' : (editingCarrierId ? 'Update Carrier' : 'Save Carrier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carriers;

