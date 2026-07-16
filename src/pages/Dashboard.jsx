import React, { useState, useEffect } from 'react';
import ActivityTimeline from '../components/common/ActivityTimeline';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalOrders: 0,
    totalDispatched: 0,
    brokerFee: 0
  });
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user) return;
        
        const buildQuery = (table, selectStr, countOpts) => {
          let query = supabase.from(table).select(selectStr, countOpts);
          if (!isAdmin) {
             query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
          }
          
          if (fromDate) {
             const start = new Date(`${fromDate}T00:00:00`);
             query = query.gte('created_at', start.toISOString());
          }
          if (toDate) {
             const end = new Date(`${toDate}T23:59:59.999`);
             query = query.lte('created_at', end.toISOString());
          }
          
          return query;
        };
        
        // Fetch all relevant records in the timeframe
        const { data: records } = await buildQuery('leads', 'id, status, deposit_amount, broker_fee_collected');
        
        let totalLeads = 0;
        let totalOrders = 0;
        let totalDispatched = 0;
        let brokerFee = 0;
        
        const orderStatuses = ['Booked', 'Dispatched', 'Picked Up', 'Delivered', 'Completed', 'Canceled'];

        if (records) {
           records.forEach(r => {
             if (orderStatuses.includes(r.status)) {
                totalOrders++;
                if (r.status === 'Dispatched') {
                   totalDispatched++;
                   if (r.broker_fee_collected === true) {
                      brokerFee += (r.deposit_amount || 0);
                   }
                }
             } else {
                totalLeads++;
             }
           });
        }

        setStats({
          totalLeads,
          totalOrders,
          totalDispatched,
          brokerFee
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
  }, [user, isAdmin, fromDate, toDate]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back. Here is your operational overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>From</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>To</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Leads</span>
          <span className={styles.statValue}>{loading ? '-' : stats.totalLeads}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Total Orders</span>
          <span className={styles.statValue}>{loading ? '-' : stats.totalOrders}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Dispatched Orders</span>
          <span className={styles.statValue}>{loading ? '-' : stats.totalDispatched}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Collected Broker Fee</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {loading ? '-' : `$${stats.brokerFee.toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr' }}>
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
      </div>
    </div>
  );
};

export default Dashboard;
