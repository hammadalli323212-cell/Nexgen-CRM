import React, { useState, useEffect } from 'react';
import ActivityTimeline from '../components/common/ActivityTimeline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    pickups: 0,
    deliveries: 0,
    pendingQuotes: 0,
    revenue: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user || !profile) return;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const isAdmin = profile.role === 'admin';
        
        // Base query builder helper
        const buildQuery = (table, selectStr, countOpts) => {
          let query = supabase.from(table).select(selectStr, countOpts);
          if (!isAdmin) {
             // If not admin, only show leads assigned to them or created by them
             query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
          }
          return query;
        };
        
        // 1. Today's Pickups
        const { count: pickupsCount } = await buildQuery('leads', '*', { count: 'exact', head: true }).eq('ship_date', todayStr).eq('is_archived', false);
        
        // 2. Today's Deliveries
        const { count: deliveriesCount } = await buildQuery('leads', '*', { count: 'exact', head: true }).eq('delivery_date', todayStr).eq('is_archived', false);
        
        // 3. Pending Quotes (Status 'New')
        const { count: pendingCount } = await buildQuery('leads', '*', { count: 'exact', head: true }).eq('status', 'New').eq('is_archived', false);
        
        // 4. Revenue Today (Broker fees of leads created today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: revenueLeads } = await buildQuery('leads', 'estimated_price, carrier_pay').gte('created_at', todayStart.toISOString()).eq('is_archived', false);
        
        let revenue = 0;
        if (revenueLeads) {
          revenueLeads.forEach(lead => {
            const price = lead.estimated_price || 0;
            const pay = lead.carrier_pay || 0;
            revenue += (price - pay);
          });
        }

        setStats({
          pickups: pickupsCount || 0,
          deliveries: deliveriesCount || 0,
          pendingQuotes: pendingCount || 0,
          revenue: revenue
        });

        // 5. Recent Activity
        const { data: activities } = await buildQuery('leads', 'id, lead_number, created_at, status, customers(first_name, last_name)').order('created_at', { ascending: false }).limit(5);
        
        if (activities) {
          const formattedActivities = activities.map(a => ({
            id: a.id,
            title: `New ${a.status === 'Booked' ? 'Order' : 'Lead'} Created: L-${a.lead_number}`,
            description: `For customer ${a.customers?.first_name} ${a.customers?.last_name}`,
            time: new Date(a.created_at).toLocaleString(),
            icon: a.status === 'Booked' ? 'CheckCircle' : 'PlusCircle',
            color: a.status === 'Booked' ? 'var(--success)' : 'var(--brand-blue)'
          }));
          setRecentActivities(formattedActivities);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user, profile]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p>Welcome back. Here is your operational overview for today.</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Today's Pickups</span>
          <span className={styles.statValue}>{loading ? '-' : stats.pickups}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Today's Deliveries</span>
          <span className={styles.statValue}>{loading ? '-' : stats.deliveries}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Pending Quotes</span>
          <span className={styles.statValue}>{loading ? '-' : stats.pendingQuotes}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Revenue Today</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {loading ? '-' : `$${stats.revenue.toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className={styles.panelsGrid}>
        <div className={styles.panel}>
          <h2>Recent Activity</h2>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Loading activity...</div>
          ) : recentActivities.length > 0 ? (
            <ActivityTimeline activities={recentActivities} />
          ) : (
            <div style={{ color: 'var(--text-muted)', marginTop: '20px' }}>No recent activity.</div>
          )}
        </div>
        <div className={styles.panel}>
          <h2>Quick Links</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
             <a href="/leads/new" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>+ Create New Lead</a>
             <a href="/quotes/wizard-create" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>+ Generate Quote</a>
             <a href="/dispatch" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>View Dispatch Board</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
