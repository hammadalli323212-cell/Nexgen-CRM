import React, { useMemo, useState, useEffect, useRef } from 'react';
import DataTable from '../components/common/DataTable';
import { supabase } from '../lib/supabase';
import { createColumnHelper } from '@tanstack/react-table';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Leads.module.css';
import toast from 'react-hot-toast';
import * as xlsx from 'xlsx';
import { useAuth } from '../lib/AuthContext';

// Removed mockLeads

const columnHelper = createColumnHelper();

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select(`
          id, 
          lead_number, 
          created_at, 
          origin_city, 
          origin_state, 
          origin_zip,
          destination_city, 
          destination_state, 
          destination_zip,
          estimated_price, 
          carrier_pay,
          ship_date,
          source,
          transport_type, 
          status,
          assignee:profiles!assigned_to(first_name, last_name),
          customers (first_name, last_name),
          lead_vehicles (vehicle_year, vehicle_make, vehicle_model)
        `).neq('status', 'Booked').eq('is_archived', false).order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const formattedLeads = sortedData.map(lead => ({
            id: lead.lead_number,
            displayId: `L-${lead.lead_number}`,
            created: new Date(lead.created_at).toLocaleString(),
            customer: lead.customers ? `${lead.customers.first_name} ${lead.customers.last_name}` : 'Unknown',
            vehicles: lead.lead_vehicles && lead.lead_vehicles.length > 0
              ? lead.lead_vehicles.map(v => `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`).join(', ')
              : 'Unknown',
            origin: `${lead.origin_city}, ${lead.origin_state}`,
            originZip: lead.origin_zip || '',
            destination: `${lead.destination_city}, ${lead.destination_state}`,
            destinationZip: lead.destination_zip || '',
            transportType: lead.transport_type,
            tariff: `$${lead.estimated_price || 0}`,
            carrierPay: `$${lead.carrier_pay || 0}`,
            brokerFee: `$${(lead.estimated_price || 0) - (lead.carrier_pay || 0)}`,
            shipDate: lead.ship_date || '',
            assignedTo: lead.assignee ? `${lead.assignee.first_name} ${lead.assignee.last_name}` : 'Unassigned',
            source: lead.source || 'Manual',
            status: lead.status
          }));
          
          setLeads(formattedLeads);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
      }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Reading file...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        toast.error('File is empty', { id: toastId });
        return;
      }

      toast.loading(`Processing 0 of ${rows.length} rows...`, { id: toastId });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (i % 5 === 0) {
            toast.loading(`Processing ${i} of ${rows.length} rows...`, { id: toastId });
          }

          // Parse Data
          const fullName = row['CustomerName'] || '';
          const firstName = fullName.split(' ')[0] || 'Unknown';
          const lastName = fullName.split(' ').slice(1).join(' ') || 'Unknown';
          const email = row['CustomerEmail'] || `unknown${Date.now() + i}@example.com`;
          const phone = row['CustomerPhone'] || '';
          const originRaw = row['Origin'] || '';
          const originCity = originRaw.split(',')[0]?.trim() || '';
          const originState = originRaw.split(',')[1]?.trim() || '';
          const destRaw = row['Destination'] || '';
          const destCity = destRaw.split(',')[0]?.trim() || '';
          const destState = destRaw.split(',')[1]?.trim() || '';
          const transportType = row['TransportType'] || 'Open';
          const sourceName = row['SourceName'] || 'Import';
          
          let tariff = row['TotalTariff'];
          if (typeof tariff === 'string') tariff = parseFloat(tariff.replace(/[^0-9.-]+/g, ''));
          
          let carrierFee = row['TotalCarrierFee'];
          if (typeof carrierFee === 'string') carrierFee = parseFloat(carrierFee.replace(/[^0-9.-]+/g, ''));

          // 1. Check or Insert Customer
          let customerId;
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert([{ first_name: firstName, last_name: lastName, email, phone }])
              .select()
              .single();
            if (customerError) throw customerError;
            customerId = newCustomer.id;
          }

          // 2. Insert Lead
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert([{
              customer_id: customerId,
              order_id: row['Order ID'] || null,
              source: sourceName,
              origin_city: originCity,
              origin_state: originState,
              destination_city: destCity,
              destination_state: destState,
              transport_type: transportType,
              estimated_price: isNaN(tariff) ? null : tariff,
              carrier_pay: isNaN(carrierFee) ? null : carrierFee,
              deposit_amount: (!isNaN(tariff) && !isNaN(carrierFee)) ? tariff - carrierFee : null,
              status: 'New',
              assigned_to: user?.id,
              created_by: user?.id
            }])
            .select()
            .single();
          if (leadError) throw leadError;

          // 3. Insert Vehicle
          if (row['Vehicles']) {
            const vString = row['Vehicles'].toString();
            const vParts = vString.split(' ');
            const vYear = vParts[0] || 'Unknown';
            const vMake = vParts[1] || 'Unknown';
            const vModel = vParts.slice(2).join(' ') || 'Unknown';

            await supabase.from('lead_vehicles').insert([{
              lead_id: newLead.id,
              vehicle_year: vYear,
              vehicle_make: vMake,
              vehicle_model: vModel
            }]);
          }

          successCount++;
        } catch (err) {
          console.error('Row error:', err);
          errorCount++;
        }
      }

      toast.success(`Import complete! ${successCount} leads added.${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, { id: toastId, duration: 5000 });
      fetchLeads(); // Refresh list

    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import file', { id: toastId });
    }
    
    // Reset input
    e.target.value = null;
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Lead #',
        cell: info => <Link to={`/leads/${info.getValue()}`} style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>{info.row.original.displayId}</Link>,
      }),
      columnHelper.accessor('created', {
        header: 'Created',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('customer', {
        header: 'Customer',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('vehicles', {
        header: 'Vehicles',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('origin', {
        header: 'Origin',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('originZip', {
        header: 'Origin Zip',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('destination', {
        header: 'Destination',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('destinationZip', {
        header: 'Dest Zip',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('shipDate', {
        header: 'Ship Date',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('transportType', {
        header: 'Transport',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('tariff', {
        header: 'Tariff',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('carrierPay', {
        header: 'Carrier Pay',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('brokerFee', {
        header: 'Broker Fee',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('assignedTo', {
        header: 'Assigned To',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <span style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            backgroundColor: info.getValue() === 'New' ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)',
            color: info.getValue() === 'New' ? '#28a745' : '#ffc107',
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
          <h1>My Leads</h1>
          <p>Manage and track your incoming leads.</p>
        </div>
        <div className={styles.actions}>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleImport} 
          />
          <button 
            className={styles.btnSecondary} 
            style={{ marginRight: '10px' }} 
            onClick={() => fileInputRef.current?.click()}
          >
            Import Excel
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/leads/new')}>+ New Lead</button>
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        <DataTable 
          columns={columns} 
          data={leads} 
          onRowClick={(row) => navigate(`/leads/${row.original.id}`)}
        />
      </div>
    </div>
  );
};

export default Leads;
