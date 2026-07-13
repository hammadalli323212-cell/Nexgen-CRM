import React, { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './CommandPalette.module.css';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ customers: [], leads: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) {
        setResults({ customers: [], leads: [] });
        return;
      }

      setIsSearching(true);
      try {
        const isNumeric = !isNaN(query) && query.trim() !== '';

        // Search Customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5);

        // Search Leads
        let leadQuery = supabase
          .from('leads')
          .select(`
            id, lead_number, order_id, status, is_archived,
            customers (first_name, last_name)
          `)
          .eq('is_archived', false)
          .limit(5);

        if (isNumeric) {
          // If it's a number, search lead_number
          leadQuery = leadQuery.eq('lead_number', parseInt(query));
        } else {
          // If not a number, search order_id or status
          leadQuery = leadQuery.or(`order_id.ilike.%${query}%,status.ilike.%${query}%`);
        }

        const { data: leads } = await leadQuery;

        setResults({
          customers: customers || [],
          leads: leads || []
        });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectLead = (leadNumber) => {
    navigate(`/leads/${leadNumber}`);
    onClose();
    setQuery('');
  };

  const handleSelectCustomer = (id) => {
    navigate(`/customers/${id}`);
    onClose();
    setQuery('');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <Search className={styles.searchIcon} size={20} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search leads, orders, customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        {query.length > 0 ? (
          <div className={styles.results}>
            {isSearching ? (
               <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>
            ) : results.customers.length === 0 && results.leads.length === 0 ? (
               <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results found.</div>
            ) : (
               <>
                 {results.leads.length > 0 && (
                   <div className={styles.resultGroup}>
                     <div className={styles.groupLabel}>Leads & Orders</div>
                     {results.leads.map(lead => (
                       <div key={lead.id} className={styles.resultItem} onClick={() => handleSelectLead(lead.lead_number)}>
                         <span className={styles.resultTitle}>
                           {lead.status === 'Booked' ? 'Order' : 'Lead'} #{lead.lead_number} {lead.order_id ? `(${lead.order_id})` : ''}
                         </span>
                         <span className={styles.resultSub}>
                           {lead.customers?.first_name} {lead.customers?.last_name} • Status: {lead.status}
                         </span>
                       </div>
                     ))}
                   </div>
                 )}
                 
                 {results.customers.length > 0 && (
                   <div className={styles.resultGroup}>
                     <div className={styles.groupLabel}>Customers</div>
                     {results.customers.map(c => (
                       <div key={c.id} className={styles.resultItem} onClick={() => handleSelectCustomer(c.id)}>
                         <span className={styles.resultTitle}>{c.first_name} {c.last_name}</span>
                         <span className={styles.resultSub}>{c.email || 'No email'} • {c.phone || 'No phone'}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </>
            )}
          </div>
        ) : (
          <div className={styles.results}>
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Start typing to search across the CRM...
            </div>
          </div>
        )}
        
        <div className={styles.footer}>
          <span><span className={styles.keyLabel}>ESC</span> to close</span>
          <span><span className={styles.keyLabel}>CLICK</span> to select</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
