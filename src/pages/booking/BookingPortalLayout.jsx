import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Phone, User } from 'lucide-react';
import styles from './BookingPortalLayout.module.css';

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
          <div className={styles.logo}>
            <img src="/logo-dark.jpg" alt="NexGen Auto Transport" style={{ height: '75px', maxWidth: '280px', objectFit: 'contain' }} />
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
