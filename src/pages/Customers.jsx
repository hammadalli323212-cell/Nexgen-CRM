import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import { supabase } from '../lib/supabase';
import styles from './Leads.module.css';

const columnHelper = createColumnHelper();

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
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
            leads ( id, estimated_price, created_at, status )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map(c => {
          const totalOrders = c.leads ? c.leads.length : 0;
          const ltv = c.leads ? c.leads.reduce((sum, lead) => sum + (lead.estimated_price || 0), 0) : 0;
          
          let lastActive = c.created_at;
          if (c.leads && c.leads.length > 0) {
            const sortedLeads = [...c.leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            lastActive = sortedLeads[0].created_at;
          }

          return {
            id: c.id,
            name: `${c.first_name || ''} ${c.last_name && c.last_name !== 'Unknown' ? c.last_name : ''}`.trim() || 'Unknown',
            phone: c.phone || 'N/A',
            email: c.email || 'N/A',
            orders: totalOrders,
            ltv: `$${ltv.toFixed(2)}`,
            lastActive: new Date(lastActive).toLocaleDateString(),
          };
        });

        setCustomers(formatted);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('phone', { header: 'Phone' }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor('orders', { header: 'Total Leads' }),
      columnHelper.accessor('ltv', { header: 'Lifetime Value' }),
      columnHelper.accessor('lastActive', { header: 'Last Active' }),
    ],
    []
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Customers</h1>
          <p>Customer relationship management and history.</p>
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading customers...</div>
        ) : (
          <DataTable 
            columns={columns} 
            data={customers} 
            onRowClick={(row) => navigate(`/customers/${row.original.id}`)}
          />
        )}
      </div>
    </div>
  );
};

export default Customers;
