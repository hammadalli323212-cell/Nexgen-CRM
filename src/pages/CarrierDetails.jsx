import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, Phone, ArrowLeft, Star, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import styles from './LeadDetails.module.css';

const columnHelper = createColumnHelper();

const CarrierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className={styles.header}>
        <button onClick={() => navigate('/carriers')} className={styles.backButton}>
          <ArrowLeft size={20} />
          Back to Carriers
        </button>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <Truck className={styles.panelIcon} size={20} />
                Carrier Details
              </h2>
            </div>
            <div className={styles.panelBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: 'var(--brand-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 15px' }}>
                    {carrier.company_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '5px' }}>{carrier.company_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
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
                  <span className={styles.infoLabel}>Out Of</span>
                  <span className={styles.infoValue}>{carrier.out_of || '-'}</span>
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
                  onRowClick={(row) => navigate(`/orders/${row.id}`)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrierDetails;
