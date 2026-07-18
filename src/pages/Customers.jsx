import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/common/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Leads.module.css';
import { toast } from 'react-hot-toast';

const columnHelper = createColumnHelper();

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isSuperAdmin, isAdmin, user } = useAuth();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        let query = supabase.from('customers');
        
        if (isAdmin || isSuperAdmin) {
          query = query.select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            created_at,
            leads ( id, estimated_price, carrier_pay, deposit_amount, created_at, status )
          `);
        } else {
          query = query.select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            created_at,
            leads!inner ( id, estimated_price, carrier_pay, deposit_amount, created_at, status )
          `).or(`created_by.eq.${user?.id},assigned_to.eq.${user?.id}`, { foreignTable: 'leads' });
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map(c => {
          const totalOrders = c.leads ? c.leads.length : 0;
          const collectedStatuses = ['Booked', 'Dispatched', 'In Transit', 'Delivered'];
          const ltv = c.leads ? c.leads.reduce((sum, lead) => {
            if (collectedStatuses.includes(lead.status)) {
              const brokerFee = lead.deposit_amount !== null && lead.deposit_amount !== undefined 
                ? lead.deposit_amount 
                : ((lead.estimated_price || 0) - (lead.carrier_pay || 0));
              return sum + brokerFee;
            }
            return sum;
          }, 0) : 0;
          
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

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedCustomers.size} customers?`)) return;
    
    try {
      const { error } = await supabase.from('customers').delete().in('id', Array.from(selectedCustomers));
      
      if (error) {
        if (error.code === '23503') {
          // PostgreSQL foreign key constraint violation
          throw new Error('Cannot delete customers that still have leads or orders tied to them. Please delete their leads first.');
        }
        throw error;
      }

      toast.success('Customers deleted successfully!');
      setCustomers(prev => prev.filter(c => !selectedCustomers.has(c.id)));
      setSelectedCustomers(new Set());
    } catch (err) {
      console.error('Failed to delete customers:', err);
      toast.error(err.message || 'Failed to delete customers.');
    }
  };

  const toggleSelection = (id) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('phone', { header: 'Phone' }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor('orders', { header: 'Total Leads' }),
      columnHelper.accessor('ltv', { header: 'Lifetime Value' }),
      columnHelper.accessor('lastActive', { header: 'Last Active' }),
    ];

    if (isSuperAdmin) {
      cols.unshift(
        columnHelper.accessor('select', {
          header: () => null,
          cell: info => (
            <input 
              type="checkbox" 
              checked={selectedCustomers.has(info.row.original.id)} 
              onChange={() => toggleSelection(info.row.original.id)} 
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
            />
          ),
        })
      );
    }

    return cols;
  }, [isSuperAdmin, selectedCustomers]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>Customers</h1>
          <p>Customer relationship management and history.</p>
        </div>
        <div className={styles.headerActions}>
          {isSuperAdmin && selectedCustomers.size > 0 && (
            <button 
              className={styles.btnSecondary} 
              onClick={handleBulkDelete}
              style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
            >
              Delete Selected ({selectedCustomers.size})
            </button>
          )}
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
