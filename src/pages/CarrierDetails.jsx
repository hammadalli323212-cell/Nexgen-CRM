import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Truck, Star, Phone, FileText, Edit, X } from 'lucide-react';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import styles from './CarrierDetails.module.css';
import modalStyles from '../components/common/CommandPalette.module.css';

const columnHelper = createColumnHelper();

const CarrierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [carrier, setCarrier] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    company_name: '', mc_number: '', dot_number: '', insurance_status: 'Pending',
    rating: 5.0, available_trucks: 1, preferred_routes: '',
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

  useEffect(() => {
    const fetchCarrierData = async () => {
      try {
        const { data: carrierData, error: carrierError } = await supabase
          .from('carriers')
          .select('*')
          .eq('id', id)
          .single();

        if (carrierError) throw carrierError;
        setCarrier(carrierData);

        if (carrierData && carrierData.company_name) {
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select(`
              id, 
              lead_number, 
              order_id, 
              status, 
              estimated_price,
              carrier_pay,
              created_at, 
              origin_city, 
              origin_state, 
              destination_city, 
              destination_state 
            `)
            .eq('carrier_company_name', carrierData.company_name);
            
          if (leadsError) throw leadsError;
          setOrders(leadsData || []);
        }

      } catch (err) {
        console.error('Error fetching carrier details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCarrierData();
  }, [id]);

  const handleOpenEditModal = () => {
    if (!carrier) return;
    setEditFormData({
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
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('carriers')
        .update(editFormData)
        .eq('id', carrier.id);

      if (error) throw error;

      toast.success('Carrier details updated successfully!');
      setCarrier(prev => ({ ...prev, ...editFormData }));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating carrier:', err);
      toast.error('Failed to update carrier: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('lead_number', {
        header: 'Lead #',
        cell: info => <span style={{ color: 'var(--brand-blue)', fontWeight: '500' }}>NG-{info.getValue()}</span>
      }),
      columnHelper.accessor('order_id', {
        header: 'Order ID',
        cell: info => info.getValue() || '-'
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => {
          const val = info.getValue();
          let bg = 'rgba(100, 116, 139, 0.1)';
          let col = '#64748b';
          if (val === 'Dispatched') { bg = 'rgba(139, 92, 246, 0.1)'; col = '#8b5cf6'; }
          else if (val === 'Picked Up') { bg = 'rgba(245, 158, 11, 0.1)'; col = '#f59e0b'; }
          else if (val === 'Delivered' || val === 'Completed') { bg = 'rgba(16, 185, 129, 0.1)'; col = '#10b981'; }

          return (
            <span className={styles.statusBadge} style={{ backgroundColor: bg, color: col, padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
              {val}
            </span>
          );
        }
      }),
      columnHelper.accessor('created_at', {
        header: 'Date Created',
        cell: info => new Date(info.getValue()).toLocaleDateString()
      }),
      columnHelper.accessor('origin', {
        header: 'Origin',
        cell: info => {
          const row = info.row.original;
          return `${row.origin_city || ''}, ${row.origin_state || ''}`.replace(/^, | , $/g, '');
        }
      }),
      columnHelper.accessor('destination', {
        header: 'Destination',
        cell: info => {
          const row = info.row.original;
          return `${row.destination_city || ''}, ${row.destination_state || ''}`.replace(/^, | , $/g, '');
        }
      }),
      columnHelper.accessor('carrier_pay', {
        header: 'Carrier Pay',
        cell: info => `$${(info.getValue() || 0).toFixed(2)}`
      }),
    ],
    []
  );

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading carrier details...</div>;
  }

  if (!carrier) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Carrier not found.</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/carriers')} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Carriers
        </button>
        {(isAdmin || isSuperAdmin) && (
          <button 
            onClick={handleOpenEditModal} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--brand-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 2px 8px rgba(15, 76, 156, 0.25)'
            }}
          >
            <Edit size={16} /> Edit Carrier
          </button>
        )}
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.panelTitle}>
                <Truck className={styles.panelIcon} size={20} />
                Carrier Details
              </h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.leftColumn}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>
                    {carrier.company_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <h3 className={styles.companyName}>{carrier.company_name}</h3>
                  {carrier.out_of && (
                    <div className={styles.outOf}>Out of {carrier.out_of}</div>
                  )}
                  <div className={styles.rating}>
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    {carrier.rating || 'N/A'} Rating
                  </div>
                </div>

                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>MC Number</span>
                  <span className={styles.infoValue}>{carrier.mc_number || '-'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>DOT Number</span>
                  <span className={styles.infoValue}>{carrier.dot_number || '-'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Company Phone</span>
                  <div className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} />
                    {carrier.company_phone || '-'}
                  </div>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Dispatch Phone</span>
                  <div className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} />
                    {carrier.dispatch_phone || '-'}
                  </div>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Driver Phone</span>
                  <div className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} />
                    {carrier.driver_phone || '-'}
                  </div>
                </div>

                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Insurance Status</span>
                  <span className={styles.infoValue}>{carrier.insurance_status || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.panelTitle}>
                <FileText className={styles.panelIcon} size={20} />
                Orders History ({orders.length})
              </h2>
            </div>
            <div className={styles.panelBody} style={{ padding: 0 }}>
              {orders.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No orders found for this carrier.
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={orders}
                  onRowClick={(row) => navigate(`/orders/${row.original.lead_number}`)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Carrier Modal */}
      {isEditModalOpen && (
        <div className={modalStyles.overlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={modalStyles.palette} style={{ padding: '24px', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Edit Carrier Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Carrier Name *</label>
                  <input required type="text" value={editFormData.company_name} onChange={e => setEditFormData({...editFormData, company_name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Out of (City, State)</label>
                  <input type="text" value={editFormData.out_of} onChange={e => setEditFormData({...editFormData, out_of: e.target.value})} placeholder="e.g. Miami, FL" style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Company Phone</label>
                  <input type="text" value={editFormData.company_phone} onChange={e => setEditFormData({...editFormData, company_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Dispatch Phone</label>
                  <input type="text" value={editFormData.dispatch_phone} onChange={e => setEditFormData({...editFormData, dispatch_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Driver Phone</label>
                  <input type="text" value={editFormData.driver_phone} onChange={e => setEditFormData({...editFormData, driver_phone: formatPhone(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>MC Number</label>
                  <input type="text" value={editFormData.mc_number} onChange={e => setEditFormData({...editFormData, mc_number: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>DOT Number</label>
                  <input type="text" value={editFormData.dot_number} onChange={e => setEditFormData({...editFormData, dot_number: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Insurance Status</label>
                  <select value={editFormData.insurance_status} onChange={e => setEditFormData({...editFormData, insurance_status: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Available Trucks</label>
                  <input type="number" value={editFormData.available_trucks} onChange={e => setEditFormData({...editFormData, available_trucks: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Rating (out of 5.0)</label>
                  <input type="number" step="0.1" value={editFormData.rating} onChange={e => setEditFormData({...editFormData, rating: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Preferred Routes</label>
                <input type="text" placeholder="e.g. East Coast, FL to NY" value={editFormData.preferred_routes} onChange={e => setEditFormData({...editFormData, preferred_routes: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--brand-blue)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  {isSaving ? 'Updating...' : 'Update Carrier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierDetails;

