import React, { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Phone, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './BookingPortalLayout.module.css';

const BookingPortalLayout = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState({ name: 'System Auto', phone: '(832) 886-1321', email: '' });

  useEffect(() => {
    const fetchAgent = async () => {
      const { data } = await supabase
        .from('leads')
        .select('profiles (first_name, last_name, phone, email)')
        .eq('lead_number', id)
        .single();
        
      if (data && data.profiles) {
        setAgent({
          name: `${data.profiles.first_name} ${data.profiles.last_name}`,
          phone: data.profiles.phone || '(832) 886-1321',
          email: data.profiles.email || ''
        });
      }
    };
    fetchAgent();
  }, [id]);
  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>
        <div className={styles.logoSection}>
          {/* Faux Logo for now */}
          <div className={styles.logo}>
            <span style={{ color: '#0066cc', fontStyle: 'italic', fontSize: '2rem', fontWeight: 'bold' }}>N</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>exGen</span>
            <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: '#666' }}>AUTO TRANSPORT</div>
          </div>
        </div>

        <div className={styles.agentSection}>
          <div className={styles.agentTitle}>YOUR AGENT</div>
          <div className={styles.agentDetails}>
            <div className={styles.agentName}>
              <User size={16} color="#0066cc" />
              <span>{agent.name}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.agentPhone}>
              <Phone size={16} color="#0066cc" />
              <span>{agent.phone}</span>
            </div>
            {agent.email && (
              <>
                <div className={styles.divider}></div>
                <a href={`mailto:${agent.email}`} style={{ textDecoration: 'none' }}>
                  <button className={styles.emailBtn}>E-Mail Agent &gt;</button>
                </a>
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
