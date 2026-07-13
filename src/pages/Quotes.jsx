import toast from 'react-hot-toast';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/common/DataTable';
import QuoteWizard from '../components/quotes/QuoteWizard';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle } from 'lucide-react';
import styles from './Leads.module.css'; // Reusing the layout styles

// Removed mockQuotes

const columnHelper = createColumnHelper();

const Quotes = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Quote #',
        cell: info => <Link to={`/quotes/${info.getValue().replace('Q-', '')}`} style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>{info.getValue()}</Link>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('created', {
        header: 'Created',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('customer', {
        header: 'Name',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
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
      columnHelper.accessor('destination', {
        header: 'Destination',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('shipDate', {
        header: 'Ship Date',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('transportType', {
        header: 'Transport Type',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('tariff', {
        header: 'Total Tariff',
        cell: info => info.getValue(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: info => (
          <button 
            style={{
              backgroundColor: 'var(--success)',
              color: 'var(--text-primary)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem'
            }}
            onClick={() => {
              toast.success(`Quote ${info.row.original.id} successfully converted to an Order!`);
              // In production, this would make an API call to create an Order record
            }}
          >
            <CheckCircle size={14} /> Book
          </button>
        )
      })
    ],
    []
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <h1>My Quotes</h1>
          <p>Manage and track your active quotes.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setIsWizardOpen(true)}>
            + New Quote Wizard
          </button>
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        <DataTable columns={columns} data={[]} />
      </div>

      {isWizardOpen && (
        <QuoteWizard onClose={() => setIsWizardOpen(false)} />
      )}
    </div>
  );
};

export default Quotes;
