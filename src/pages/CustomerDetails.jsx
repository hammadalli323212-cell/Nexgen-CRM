import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, ArrowLeft, Star, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import styles from './LeadDetails.module.css';

const columnHelper = createColumnHelper();

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            created_at,
            leads ( 
              id, 
              lead_number, 
              order_id, 
              status, 
              estimated_price,
              carrier_pay,
              deposit_amount, 
              created_at, 
              origin_city, 
              origin_state, 
              destination_city, 
              destination_state 
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCustomer(data);
      } catch (err) {
        console.error('Error fetching customer details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
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
        cell: info => (
          <span className={styles.statusBadge} style={{ 
            backgroundColor: info.getValue() === 'Booked' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: info.getValue() === 'Booked' ? '#10b981' : '#60a5fa',
            padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem'
          }}>
            {info.getValue()}
          </span>
        )
      }),
      columnHelper.accessor('created_at', {
        header: 'Date Created',
        cell: info => new Date(info.getValue()).toLocaleDateString()
      }),
      columnHelper.accessor('origin', {
        header: 'Origin',
        cell: info => info.getValue()
      }),
      columnHelper.accessor('destination', {
        header: 'Destination',
        cell: info => info.getValue()
      }),
      columnHelper.accessor('estimated_price', {
        header: 'Tariff',
        cell: info => `$${(info.getValue() || 0).toFixed(2)}`
      }),
    ],
    []
  );

  if (loading) {
    return <div className={styles.loading}>Loading customer details...</div>;
  }

  if (!customer) {
    return <div className={styles.loading}>Customer not found.</div>;
  }

  const totalOrders = customer.leads ? customer.leads.length : 0;
  const ltv = customer.leads ? customer.leads.reduce((sum, lead) => {
    const deposit = Number(lead.deposit_amount || 0);
    const fallbackFee = (Number(lead.estimated_price || 0) - Number(lead.carrier_pay || 0));
    const brokerFee = deposit > 0 ? deposit : fallbackFee;
    return sum + brokerFee;
  }, 0) : 0;
  
  const leadsData = (customer.leads || []).map(lead => ({
    ...lead,
    origin: `${lead.origin_city || ''}, ${lead.origin_state || ''}`.replace(/^, |, $/g, '') || '-',
    destination: `${lead.destination_city || ''}, ${lead.destination_state || ''}`.replace(/^, |, $/g, '') || '-'
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className={styles.pageContainer}>
      <button 
        onClick={() => navigate('/customers')} 
        style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
      >
        <ArrowLeft size={16} /> Back to Customers
      </button>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.leadTitle}>
            {customer.first_name} {customer.last_name}
          </h1>
          <span className={styles.subTitle}>
            Customer since {new Date(customer.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        
        {/* Main Column */}
        <div className={styles.mainColumn}>
          
          <div className={styles.panel}>
            <div className={styles.panelHeader}><Clock size={18} /> Lead & Order History</div>
            <div className={styles.panelBody} style={{ padding: 0 }}>
              {leadsData.length > 0 ? (
                <DataTable 
                  columns={columns} 
                  data={leadsData} 
                  onRowClick={(row) => navigate(`/leads/${row.original.lead_number}`)}
                />
              ) : (
                <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No leads or orders found for this customer.</div>
              )}
            </div>
          </div>

        </div>

        {/* Side Column */}
        <div className={styles.sideColumn}>
          
          {/* Contact Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}><User size={18} /> Contact Info</div>
            <div className={styles.panelBody}>
              <div className={styles.infoGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}><Phone size={12} style={{display: 'inline', marginRight: '4px'}}/> Phone</span>
                  <span className={styles.infoValue}>{customer.phone || 'N/A'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}><Mail size={12} style={{display: 'inline', marginRight: '4px'}}/> Email</span>
                  <span className={styles.infoValue}>{customer.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financials Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}><Star size={18} /> Customer Value</div>
            <div className={styles.panelBody}>
              <div className={styles.infoBlock} style={{ marginBottom: '16px' }}>
                <span className={styles.infoLabel}>Lifetime Value</span>
                <span className={styles.infoValue} style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--success)' }}>
                  ${ltv.toFixed(2)}
                </span>
              </div>
              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>Total Leads/Orders</span>
                <span className={styles.infoValue}>{totalOrders}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default CustomerDetails;
