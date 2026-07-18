import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Phone, User, Truck } from 'lucide-react';
import styles from './BookingPortalLayout.module.css';
import { TENANT } from '../../config/tenant';

const BookingPortalLayout = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('agent');
  
  const [agent, setAgent] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const url = agentId 
          ? `/api/get-agent?lead_number=${id}&agent_id=${agentId}`
          : `/api/get-agent?lead_number=${id}`;
          
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setAgent(data);
        }
      } catch (error) {
        console.error('Agent fetch error:', error);
      }
    };
    fetchAgent();
  }, [id]);
  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>
        <div className={styles.logoSection}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {TENANT.LOGO_DARK ? (
            <img src={TENANT.LOGO_DARK} alt={TENANT.COMPANY_NAME} style={{ height: '75px', maxWidth: '280px', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Truck size={36} color="var(--brand-blue)" />
              <h1 style={{ color: 'var(--brand-blue)', fontSize: '24px', margin: 0 }}>{TENANT.COMPANY_NAME}</h1>
            </div>
          )}
        </div>
        </div>

        <div className={styles.agentSection}>
          <div className={styles.agentTitle}>YOUR AGENT</div>
          <div className={styles.agentDetails}>
            {agent.name && (
              <div className={styles.agentName}>
                <User size={16} color="#0066cc" />
                <span>{agent.name}</span>
              </div>
            )}
            {agent.phone && (
              <>
                <div className={styles.divider}></div>
                <div className={styles.agentPhone}>
                  <Phone size={16} color="#0066cc" />
                  <span>{agent.phone}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default BookingPortalLayout;
