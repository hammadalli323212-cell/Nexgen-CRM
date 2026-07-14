import React, { useState, useEffect } from 'react';
import ActivityTimeline from '../components/common/ActivityTimeline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    pickups: 0,
    deliveries: 0,
    pendingQuotes: 0,
    revenue: 0
  });
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    startDate: todayStr,
    endDate: todayStr
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user) return;
        
        const startDateTime = `${dateRange.startDate}T00:00:00.000Z`;
        const endDateTime = `${dateRange.endDate}T23:59:59.999Z`;

        // 1. Pickups in range
        const { count: pickupsCount } = await buildQuery('leads', '*', { count: 'exact', head: true })
          .gte('ship_date', dateRange.startDate)
          .lte('ship_date', dateRange.endDate)
          .eq('is_archived', false);
        
        // 2. Deliveries in range
        const { count: deliveriesCount } = await buildQuery('leads', '*', { count: 'exact', head: true })
          .gte('delivery_date', dateRange.startDate)
          .lte('delivery_date', dateRange.endDate)
          .eq('is_archived', false);
        
        // 3. Leads Created in range (Replaced Pending Quotes)
        const { count: pendingCount } = await buildQuery('leads', '*', { count: 'exact', head: true })
          .gte('created_at', startDateTime)
          .lte('created_at', endDateTime)
          .eq('is_archived', false);
        
        // 4. Revenue in range (Broker fees of leads created in range)
        const { data: revenueLeads } = await buildQuery('leads', 'estimated_price, carrier_pay')
          .gte('created_at', startDateTime)
          .lte('created_at', endDateTime)
          .eq('is_archived', false);
        
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
            title: `New ${a.status === 'Booked' ? 'Order' : 'Lead'} Created: NG-${a.lead_number}`,
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
  }, [user, isAdmin, dateRange]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back. Here is your operational overview.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--panel-bg)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Date</label>
             <input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To Date</label>
             <input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Pickups</span>
          <span className={styles.statValue}>{loading ? '-' : stats.pickups}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Deliveries</span>
          <span className={styles.statValue}>{loading ? '-' : stats.deliveries}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>New Leads</span>
          <span className={styles.statValue}>{loading ? '-' : stats.pendingQuotes}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Revenue</span>
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
