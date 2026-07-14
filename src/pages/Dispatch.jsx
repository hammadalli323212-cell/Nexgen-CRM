import toast from 'react-hot-toast';
import React, { useMemo, useState, useEffect } from 'react';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import { supabase } from '../lib/supabase';
import styles from './Leads.module.css';
import modalStyles from '../components/common/CommandPalette.module.css';

const columnHelper = createColumnHelper();

const Dispatch = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [availableOrders, setAvailableOrders] = useState([]);
  const [availableCarriers, setAvailableCarriers] = useState([]);
  
  const [formData, setFormData] = useState({ lead_id: '', carrier_id: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch currently dispatched or booked orders
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, lead_number, status, carrier_pay, ship_date,
          carriers ( name, mc_number )
        `)
        .in('status', ['Booked', 'Dispatched', 'In Transit', 'Delivered'])
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDispatches(data);

      // Fetch lists for the assignment modal
      const { data: orders } = await supabase.from('leads').select('id, lead_number, origin_city, destination_city').eq('status', 'Booked').eq('is_archived', false);
      const { data: carriersList } = await supabase.from('carriers').select('id, name').eq('insurance_status', 'Active');
      
      setAvailableOrders(orders || []);
      setAvailableCarriers(carriersList || []);
      
      if (orders?.length > 0 && carriersList?.length > 0) {
        setFormData({ lead_id: orders[0].id, carrier_id: carriersList[0].id });
      }
    } catch (err) {
      console.error('Error fetching dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.carrier_id) return toast.error('Select an order and carrier');
    
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('leads')
        .update({ carrier_id: formData.carrier_id, status: 'Dispatched' })
        .eq('id', formData.lead_id);
        
      if (error) throw error;
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Error dispatching: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('lead_number', { 
        header: 'Order #',
        cell: info => `NG-${info.getValue()}`
      }),
      columnHelper.accessor('carriers.name', { 
        header: 'Carrier',
        cell: info => info.getValue() || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
      }),
      columnHelper.accessor('carriers.mc_number', { 
        header: 'MC Number',
        cell: info => info.getValue() || '-'
      }),
      columnHelper.accessor('ship_date', { 
        header: 'Schedule',
        cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'TBD'
      }),
      columnHelper.accessor('carrier_pay', { 
        header: 'Carrier Pay',
        cell: info => info.getValue() ? `$${info.getValue().toFixed(2)}` : '-'
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <span style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            backgroundColor: info.getValue() === 'Booked' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(40, 167, 69, 0.1)',
            color: info.getValue() === 'Booked' ? '#3b82f6' : '#28a745',
          }}>
            {info.getValue()}
          </span>
        ),
      }),
    ],
    []
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Dispatch Board</h1>
          <p>Assign booked orders to active carriers in your network.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>+ Dispatch Order</button>
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading dispatch board...</div>
        ) : (
          <DataTable columns={columns} data={dispatches} />
        )}
      </div>

      {isModalOpen && (
        <div className={modalStyles.overlay} onClick={() => setIsModalOpen(false)}>
          <div className={modalStyles.palette} style={{ padding: '24px', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Dispatch Order to Carrier</h2>
            
            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Select Booked Order</label>
                <select value={formData.lead_id} onChange={e => setFormData({...formData, lead_id: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                  {availableOrders.length === 0 && <option value="">No unassigned booked orders</option>}
                  {availableOrders.map(o => (
                    <option key={o.id} value={o.id}>Order NG-{o.lead_number} ({o.origin_city} to {o.destination_city})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>Select Carrier</label>
                <select value={formData.carrier_id} onChange={e => setFormData({...formData, carrier_id: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                  {availableCarriers.length === 0 && <option value="">No active carriers available</option>}
                  {availableCarriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving || availableOrders.length === 0 || availableCarriers.length === 0} style={{ padding: '8px 16px', background: 'var(--brand-blue)', border: 'none', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
                  {isSaving ? 'Dispatching...' : 'Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dispatch;
